package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateShipmentRequest;
import com.example.demo.dto.request.UpdateShipmentRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShipmentResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
import com.example.demo.service.NotificationService;
import com.example.demo.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {

    private static final String ORDER_NOT_FOUND_PREFIX = "Không tìm thấy đơn hàng #";
    private static final String ORDER_CODE_PREFIX = "Đơn hàng #";
    private static final String ENTITY_TYPE_SHIPMENT = "SHIPMENT";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentResponse> getOrderShipments(Long orderId, String currentUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ORDER_NOT_FOUND_PREFIX + orderId));

        if (currentUsername != null && !currentUsername.isBlank()) {
            User user = userRepository.findByUsername(currentUsername).orElse(null);
            if (user != null) {
                boolean isBuyer = Objects.equals(order.getUserId(), user.getId());
                boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
                boolean isShopManager = isUserShopManagerForShop(user, order.getShopId());
                if (!isBuyer && !isAdmin && !isShopManager) {
                    throw new ForbiddenException("Bạn không có quyền xem thông tin vận chuyển của đơn hàng này");
                }
            }
        }

        List<Shipment> shipments = shipmentRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
        return shipments.stream().map(this::mapToResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShipmentResponse> getShopShipments(Long shopId, ShipmentStatus status, int page, int size, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<Shipment> shipmentPage = shipmentRepository.findByShopIdAndStatus(shopId, status, pageable);

        return PageResponse.<ShipmentResponse>builder()
                .content(shipmentPage.getContent().stream().map(this::mapToResponse).toList())
                .page(shipmentPage.getNumber())
                .size(shipmentPage.getSize())
                .totalElements(shipmentPage.getTotalElements())
                .totalPages(shipmentPage.getTotalPages())
                .last(shipmentPage.isLast())
                .first(shipmentPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public ShipmentResponse createShopShipment(Long shopId, Long orderId, CreateShipmentRequest request, String currentUsername) {
        User user = verifyShopPermission(shopId, currentUsername);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ORDER_NOT_FOUND_PREFIX + orderId));

        if (!Objects.equals(order.getShopId(), shopId)) {
            throw new BadRequestException(ORDER_CODE_PREFIX + orderId + " không thuộc quyền quản lý của cửa hàng #" + shopId);
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new BadRequestException("Đơn hàng đã bị hủy, không thể tạo vận đơn giao hàng");
        }

        String trackingCode = request.getTrackingCode();
        if (trackingCode == null || trackingCode.isBlank()) {
            trackingCode = "TRK-" + (System.currentTimeMillis() % 10000000) + "-" + (100 + SECURE_RANDOM.nextInt(900));
        }

        Shipment shipment = Shipment.builder()
                .orderId(orderId)
                .carrier(request.getCarrier())
                .trackingCode(trackingCode)
                .status(ShipmentStatus.IN_TRANSIT)
                .shippingFee(request.getShippingFee() != null ? request.getShippingFee() : order.getShippingFee())
                .shippedAt(LocalDateTime.now())
                .note(request.getNote())
                .build();

        Shipment saved = shipmentRepository.save(shipment);

        // Đồng bộ trạng thái đơn hàng sang SHIPPED
        if (order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.PROCESSING) {
            order.setStatus(OrderStatus.SHIPPED);
            order.setShippedAt(LocalDateTime.now());
            orderRepository.save(order);
        }

        // Gửi thông báo cho khách hàng
        notificationService.createNotification(
                order.getUserId(),
                "SHIPMENT_CREATED",
                "Đơn hàng đang được giao",
                ORDER_CODE_PREFIX + order.getOrderCode() + " đã được xuất kho và bàn giao cho " + request.getCarrier() + " (Mã vận đơn: " + trackingCode + ")",
                "ORDER",
                order.getId()
        );

        auditLogService.log(user.getId(), "CREATE_SHIPMENT", ENTITY_TYPE_SHIPMENT, String.valueOf(saved.getId()), shopId,
                "Tạo vận đơn giao hàng #" + trackingCode + " cho đơn #" + order.getOrderCode());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ShipmentResponse updateShopShipment(Long shopId, Long shipmentId, UpdateShipmentRequest request, String currentUsername) {
        User user = verifyShopPermission(shopId, currentUsername);

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin vận đơn #" + shipmentId));

        Order order = orderRepository.findById(shipment.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(ORDER_NOT_FOUND_PREFIX + shipment.getOrderId()));

        if (!Objects.equals(order.getShopId(), shopId)) {
            throw new BadRequestException("Vận đơn #" + shipmentId + " không thuộc quyền quản lý của cửa hàng #" + shopId);
        }

        applyShipmentUpdate(shipment, order, request);
        Shipment saved = shipmentRepository.save(shipment);

        auditLogService.log(user.getId(), "UPDATE_SHIPMENT", ENTITY_TYPE_SHIPMENT, String.valueOf(saved.getId()), shopId,
                "Cửa hàng cập nhật vận đơn sang trạng thái " + saved.getStatus());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShipmentResponse> getAdminShipments(ShipmentStatus status, int page, int size, String currentUsername) {
        verifyAdminAccess(currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<Shipment> shipmentPage = shipmentRepository.findAllByStatus(status, pageable);

        return PageResponse.<ShipmentResponse>builder()
                .content(shipmentPage.getContent().stream().map(this::mapToResponse).toList())
                .page(shipmentPage.getNumber())
                .size(shipmentPage.getSize())
                .totalElements(shipmentPage.getTotalElements())
                .totalPages(shipmentPage.getTotalPages())
                .last(shipmentPage.isLast())
                .first(shipmentPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public ShipmentResponse adminUpdateShipment(Long shipmentId, UpdateShipmentRequest request, String currentUsername) {
        User admin = verifyAdminAccess(currentUsername);

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin vận đơn #" + shipmentId));

        Order order = orderRepository.findById(shipment.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(ORDER_NOT_FOUND_PREFIX + shipment.getOrderId()));

        applyShipmentUpdate(shipment, order, request);
        Shipment saved = shipmentRepository.save(shipment);

        auditLogService.log(admin.getId(), "ADMIN_UPDATE_SHIPMENT", ENTITY_TYPE_SHIPMENT, String.valueOf(saved.getId()), order.getShopId(),
                "Admin can thiệp vận đơn sang trạng thái " + saved.getStatus() + (request.getNote() != null ? " (" + request.getNote() + ")" : ""));

        return mapToResponse(saved);
    }

    private void applyShipmentUpdate(Shipment shipment, Order order, UpdateShipmentRequest request) {
        if (request.getCarrier() != null && !request.getCarrier().isBlank()) {
            shipment.setCarrier(request.getCarrier());
        }
        if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank()) {
            shipment.setTrackingCode(request.getTrackingCode());
        }
        if (request.getNote() != null) {
            shipment.setNote(request.getNote());
        }

        handleStatusTransition(shipment, order, request.getStatus());
    }

    private void handleStatusTransition(Shipment shipment, Order order, ShipmentStatus newStatus) {
        if (newStatus == null || newStatus == shipment.getStatus()) {
            return;
        }
        shipment.setStatus(newStatus);
        if (newStatus == ShipmentStatus.IN_TRANSIT && shipment.getShippedAt() == null) {
            shipment.setShippedAt(LocalDateTime.now());
            if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.CANCELLED) {
                order.setStatus(OrderStatus.SHIPPED);
                order.setShippedAt(LocalDateTime.now());
                orderRepository.save(order);
            }
        } else if (newStatus == ShipmentStatus.DELIVERED) {
            handleDeliveredStatus(shipment, order);
        }
    }

    private void handleDeliveredStatus(Shipment shipment, Order order) {
        shipment.setDeliveredAt(LocalDateTime.now());
        if (order.getStatus() != OrderStatus.CANCELLED) {
            order.setStatus(OrderStatus.DELIVERED);
            order.setDeliveredAt(LocalDateTime.now());
            order.setPaymentStatus(PaymentStatus.PAID);
            orderRepository.save(order);
        }
        notificationService.createNotification(
                order.getUserId(),
                "ORDER_DELIVERED",
                "Đơn hàng giao thành công",
                ORDER_CODE_PREFIX + order.getOrderCode() + " đã được giao thành công. Hãy đánh giá sản phẩm để chia sẻ trải nghiệm nhé!",
                "ORDER",
                order.getId()
        );
    }

    private User verifyShopPermission(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));
        if (user.getRole() == null) {
            throw new UnauthorizedException("Tài khoản không hợp lệ hoặc thiếu quyền hạn");
        }
        boolean isShopManager = isUserShopManagerForShop(user, shopId);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        if (!isShopManager && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền quản lý vận chuyển của cửa hàng #" + shopId);
        }
        return user;
    }

    private boolean isUserShopManagerForShop(User user, Long shopId) {
        if (user == null || user.getId() == null || shopId == null) return false;
        boolean isOwner = shopRepository.findById(shopId)
                .map(s -> Objects.equals(s.getOwnerId(), user.getId()))
                .orElse(false);
        if (isOwner) return true;
        return shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
    }

    private User verifyAdminAccess(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        if (user.getRole() == null || (user.getRole() != Role.ADMIN && user.getRole() != Role.ROLE_ADMIN)) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống mới có quyền thực hiện thao tác này");
        }
        return user;
    }

    private ShipmentResponse mapToResponse(Shipment s) {
        String orderCode = null;
        Long shopId = null;
        String shopName = null;

        Order o = s.getOrder();
        if (o == null && s.getOrderId() != null) {
            o = orderRepository.findById(s.getOrderId()).orElse(null);
        }

        if (o != null) {
            orderCode = o.getOrderCode();
            shopId = o.getShopId();
            if (o.getShop() != null) {
                shopName = o.getShop().getName();
            } else if (shopId != null) {
                shopName = shopRepository.findById(shopId).map(Shop::getName).orElse(null);
            }
        }

        return ShipmentResponse.builder()
                .id(s.getId())
                .orderId(s.getOrderId())
                .orderCode(orderCode)
                .shopId(shopId)
                .shopName(shopName)
                .carrier(s.getCarrier())
                .trackingCode(s.getTrackingCode())
                .status(s.getStatus())
                .shippingFee(s.getShippingFee())
                .shippedAt(s.getShippedAt())
                .deliveredAt(s.getDeliveredAt())
                .note(s.getNote())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}

