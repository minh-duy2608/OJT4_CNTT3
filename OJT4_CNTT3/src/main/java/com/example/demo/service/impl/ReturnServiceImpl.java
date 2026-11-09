package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateReturnRequest;
import com.example.demo.dto.request.ProcessReturnRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ReturnResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
import com.example.demo.service.NotificationService;
import com.example.demo.service.ReturnService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReturnServiceImpl implements ReturnService {

    private final OrderReturnRepository orderReturnRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public ReturnResponse createReturnRequest(Long orderId, CreateReturnRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (!Objects.equals(order.getUserId(), user.getId())) {
            throw new ForbiddenException("Bạn không thể yêu cầu trả hàng cho đơn hàng của người khác");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể yêu cầu trả hàng khi đơn hàng đã được giao thành công (DELIVERED)");
        }

        boolean hasActiveReturn = orderReturnRepository.existsByOrderIdAndStatusNotIn(
                orderId, List.of(ReturnStatus.CANCELLED, ReturnStatus.REJECTED)
        );
        if (hasActiveReturn) {
            throw new BadRequestException("Đơn hàng này đang có một yêu cầu trả hàng đang được xử lý");
        }

        OrderReturn orderReturn = OrderReturn.builder()
                .orderId(orderId)
                .requestedBy(user.getId())
                .reason(request.getReason())
                .description(request.getDescription())
                .status(ReturnStatus.REQUESTED)
                .refundAmount(order.getTotalAmount())
                .build();

        OrderReturn saved = orderReturnRepository.save(orderReturn);

        // Thông báo cho cửa hàng
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop != null && shop.getOwnerId() != null) {
            notificationService.createNotification(
                    shop.getOwnerId(),
                    "RETURN_REQUESTED",
                    "Yêu cầu trả hàng mới",
                    "Khách hàng " + user.getFullName() + " vừa gửi yêu cầu trả hàng cho đơn #" + order.getOrderCode() + ": " + request.getReason(),
                    "RETURN",
                    saved.getId()
            );
        }

        auditLogService.log(user.getId(), "REQUEST_RETURN", "RETURN", String.valueOf(saved.getId()), order.getShopId(),
                "Khách hàng yêu cầu trả hàng cho đơn #" + order.getOrderCode() + ". Lý do: " + request.getReason());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnResponse> getMyReturns(int page, int size, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<OrderReturn> returnPage = orderReturnRepository.findByRequestedByOrderByCreatedAtDesc(user.getId(), pageable);

        return PageResponse.<ReturnResponse>builder()
                .content(returnPage.getContent().stream().map(this::mapToResponse).toList())
                .page(returnPage.getNumber())
                .size(returnPage.getSize())
                .totalElements(returnPage.getTotalElements())
                .totalPages(returnPage.getTotalPages())
                .last(returnPage.isLast())
                .first(returnPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReturnResponse getReturnDetail(Long returnId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        OrderReturn ret = orderReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng #" + returnId));

        Order order = orderRepository.findById(ret.getOrderId()).orElse(null);
        Long shopId = order != null ? order.getShopId() : null;

        boolean isRequester = Objects.equals(ret.getRequestedBy(), user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        boolean isShopManager = isUserShopManager(user, shopId);

        if (!isRequester && !isAdmin && !isShopManager) {
            throw new ForbiddenException("Bạn không có quyền xem chi tiết yêu cầu trả hàng này");
        }

        return mapToResponse(ret);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnResponse> getShopReturns(Long shopId, ReturnStatus status, int page, int size, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<OrderReturn> returnPage = orderReturnRepository.findByShopIdAndStatus(shopId, status, pageable);

        return PageResponse.<ReturnResponse>builder()
                .content(returnPage.getContent().stream().map(this::mapToResponse).toList())
                .page(returnPage.getNumber())
                .size(returnPage.getSize())
                .totalElements(returnPage.getTotalElements())
                .totalPages(returnPage.getTotalPages())
                .last(returnPage.isLast())
                .first(returnPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public ReturnResponse processShopReturn(Long shopId, Long returnId, ProcessReturnRequest request, String currentUsername) {
        User user = verifyShopPermission(shopId, currentUsername);

        OrderReturn ret = orderReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng #" + returnId));

        Order order = orderRepository.findById(ret.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + ret.getOrderId()));

        if (!Objects.equals(order.getShopId(), shopId)) {
            throw new BadRequestException("Yêu cầu trả hàng #" + returnId + " không thuộc cửa hàng #" + shopId);
        }

        applyReturnStatus(ret, order, request, user);
        OrderReturn saved = orderReturnRepository.save(ret);

        auditLogService.log(user.getId(), "PROCESS_SHOP_RETURN", "RETURN", String.valueOf(saved.getId()), shopId,
                "Cửa hàng cập nhật yêu cầu trả hàng sang " + saved.getStatus());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReturnResponse> getAdminReturns(ReturnStatus status, int page, int size, String currentUsername) {
        verifyAdminAccess(currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<OrderReturn> returnPage = orderReturnRepository.findAllByStatus(status, pageable);

        return PageResponse.<ReturnResponse>builder()
                .content(returnPage.getContent().stream().map(this::mapToResponse).toList())
                .page(returnPage.getNumber())
                .size(returnPage.getSize())
                .totalElements(returnPage.getTotalElements())
                .totalPages(returnPage.getTotalPages())
                .last(returnPage.isLast())
                .first(returnPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public ReturnResponse adminProcessReturn(Long returnId, ProcessReturnRequest request, String currentUsername) {
        User admin = verifyAdminAccess(currentUsername);

        OrderReturn ret = orderReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu trả hàng #" + returnId));

        Order order = orderRepository.findById(ret.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + ret.getOrderId()));

        applyReturnStatus(ret, order, request, admin);
        OrderReturn saved = orderReturnRepository.save(ret);

        auditLogService.log(admin.getId(), "ADMIN_PROCESS_RETURN", "RETURN", String.valueOf(saved.getId()), order.getShopId(),
                "Quản trị viên can thiệp xử lý yêu cầu trả hàng sang " + saved.getStatus());

        return mapToResponse(saved);
    }

    private void applyReturnStatus(OrderReturn ret, Order order, ProcessReturnRequest request, User processor) {
        ret.setStatus(request.getStatus());
        ret.setProcessedBy(processor.getId());
        ret.setProcessedAt(LocalDateTime.now());
        if (request.getResolutionNote() != null) {
            ret.setResolutionNote(request.getResolutionNote());
        }
        if (request.getRefundAmount() != null) {
            ret.setRefundAmount(request.getRefundAmount());
        }

        // Nếu hoàn tiền thành công -> cập nhật trạng thái đơn hàng sang RETURNED
        if (request.getStatus() == ReturnStatus.REFUNDED) {
            order.setStatus(OrderStatus.RETURNED);
            orderRepository.save(order);
        }

        // Thông báo cho khách hàng
        String statusText = switch (request.getStatus()) {
            case APPROVED -> "được chấp thuận";
            case REJECTED -> "bị từ chối";
            case PICKUP_PENDING -> "đang chờ lấy hàng trả";
            case RECEIVED -> "đã nhận được hàng trả lại";
            case REFUNDED -> "đã hoàn tiền thành công";
            case CANCELLED -> "đã bị hủy";
            case REQUESTED -> "đang được xem xét";
        };

        notificationService.createNotification(
                ret.getRequestedBy(),
                "RETURN_STATUS_UPDATED",
                "Cập nhật yêu cầu trả hàng",
                "Yêu cầu trả hàng cho đơn #" + order.getOrderCode() + " đã " + statusText + (request.getResolutionNote() != null ? ": " + request.getResolutionNote() : ""),
                "RETURN",
                ret.getId()
        );
    }

    private User getCurrentUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));
    }

    private User verifyShopPermission(Long shopId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isShopManager = isUserShopManager(user, shopId);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        if (!isShopManager && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền quản lý trả hàng của cửa hàng #" + shopId);
        }
        return user;
    }

    private boolean isUserShopManager(User user, Long shopId) {
        if (user == null || shopId == null) return false;
        boolean isOwner = shopRepository.findById(shopId)
                .map(s -> Objects.equals(s.getOwnerId(), user.getId()))
                .orElse(false);
        if (isOwner) return true;
        return shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
    }

    private User verifyAdminAccess(String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống mới có quyền thực hiện thao tác này");
        }
        return user;
    }

    private ReturnResponse mapToResponse(OrderReturn r) {
        String requesterName = null;
        if (r.getRequester() != null) {
            requesterName = r.getRequester().getFullName();
        } else if (r.getRequestedBy() != null) {
            requesterName = userRepository.findById(r.getRequestedBy()).map(User::getFullName).orElse(null);
        }

        String processorName = null;
        if (r.getProcessor() != null) {
            processorName = r.getProcessor().getFullName();
        } else if (r.getProcessedBy() != null) {
            processorName = userRepository.findById(r.getProcessedBy()).map(User::getFullName).orElse(null);
        }

        String orderCode = null;
        Long shopId = null;
        String shopName = null;

        Order o = r.getOrder();
        if (o == null && r.getOrderId() != null) {
            o = orderRepository.findById(r.getOrderId()).orElse(null);
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

        return ReturnResponse.builder()
                .id(r.getId())
                .orderId(r.getOrderId())
                .orderCode(orderCode)
                .shopId(shopId)
                .shopName(shopName)
                .requestedBy(r.getRequestedBy())
                .requesterName(requesterName)
                .reason(r.getReason())
                .description(r.getDescription())
                .status(r.getStatus())
                .refundAmount(r.getRefundAmount())
                .processedBy(r.getProcessedBy())
                .processorName(processorName)
                .processedAt(r.getProcessedAt())
                .resolutionNote(r.getResolutionNote())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}

