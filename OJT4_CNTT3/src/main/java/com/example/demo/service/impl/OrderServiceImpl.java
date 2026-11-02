package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateOrderItemRequest;
import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderItemResponse;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final AddressRepository addressRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryRepository inventoryRepository;

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để tạo đơn hàng");
        }

        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Đơn hàng phải có ít nhất một sản phẩm");
        }

        // 1. Snapshot địa chỉ nhận hàng
        String recipientName = request.getRecipientName();
        String recipientPhone = request.getRecipientPhone();
        String shippingAddress = request.getShippingAddress();
        Long addressId = request.getAddressId();

        if (addressId != null) {
            Address address = addressRepository.findByIdAndUser(addressId, user).orElse(null);
            if (address != null) {
                if (recipientName == null || recipientName.isBlank()) recipientName = address.getRecipientName();
                if (recipientPhone == null || recipientPhone.isBlank()) recipientPhone = address.getPhone();
                if (shippingAddress == null || shippingAddress.isBlank()) {
                    shippingAddress = String.format("%s, %s, %s, %s",
                            address.getAddressDetail(), address.getWard(), address.getDistrict(), address.getProvince());
                }
            }
        }

        if (recipientName == null || recipientName.isBlank()) {
            recipientName = user.getFullName() != null ? user.getFullName() : user.getUsername();
        }
        if (recipientPhone == null || recipientPhone.isBlank()) {
            recipientPhone = user.getPhone() != null ? user.getPhone() : "0362490374";
        }
        if (shippingAddress == null || shippingAddress.isBlank()) {
            shippingAddress = "Địa chỉ nhận hàng mặc định";
        }

        // 2. Xác định shopId và kiểm tra trạng thái hoạt động của Shop
        Long targetShopId = request.getShopId();
        if (targetShopId == null) {
            targetShopId = shopRepository.findAll().stream().findFirst().map(Shop::getId).orElse(1L);
        }

        final Long resolvedShopId = targetShopId;
        Shop shop = shopRepository.findById(resolvedShopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + resolvedShopId));
        if (shop.getStatus() != ShopStatus.ACTIVE) {
            throw new BadRequestException("Cửa hàng '" + shop.getName() + "' hiện đang tạm ngừng hoạt động (" + shop.getStatus() + "). Không thể tạo đơn hàng mới.");
        }

        // 3. Khởi tạo mã đơn hàng duy nhất
        String orderCode = "CYBER-" + (System.currentTimeMillis() % 1000000) + "-" + ThreadLocalRandom.current().nextInt(100, 999);

        Order order = Order.builder()
                .orderCode(orderCode)
                .userId(user.getId())
                .shopId(targetShopId)
                .addressId(addressId)
                .recipientName(recipientName)
                .recipientPhone(recipientPhone)
                .shippingAddress(shippingAddress)
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "COD")
                .note(request.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;

        // 4. Duyệt các sản phẩm và cập nhật tồn kho
        for (CreateOrderItemRequest itemReq : request.getItems()) {
            ProductVariant variant = null;
            if (itemReq.getVariantId() != null) {
                variant = productVariantRepository.findById(itemReq.getVariantId()).orElse(null);
            }

            Product product = null;
            if (variant != null) {
                product = variant.getProduct();
                if (order.getShopId() == null || Objects.equals(order.getShopId(), 1L)) {
                    if (product != null && product.getShopId() != null) {
                        order.setShopId(product.getShopId());
                    }
                }
            } else if (itemReq.getProductId() != null) {
                product = productRepository.findById(itemReq.getProductId()).orElse(null);
                if (product != null && product.getVariants() != null && !product.getVariants().isEmpty()) {
                    variant = product.getVariants().get(0);
                }
            }

            int qty = itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1;
            BigDecimal unitPrice;

            String prodName = itemReq.getProductName();
            String varName = itemReq.getVariantName();
            String sku = itemReq.getSku();
            String imgUrl = itemReq.getImageUrl();

            if (variant != null) {
                if (prodName == null || prodName.isBlank()) {
                    prodName = variant.getProduct() != null ? variant.getProduct().getName() : "Sản phẩm Cyber";
                }
                if (varName == null || varName.isBlank()) {
                    varName = variant.getVariantName() != null ? variant.getVariantName() : "Tiêu chuẩn";
                }
                if (sku == null || sku.isBlank()) {
                    sku = variant.getSku() != null ? variant.getSku() : "SKU-" + variant.getId();
                }

                unitPrice = variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice();
                if (unitPrice == null && itemReq.getPrice() != null) {
                    unitPrice = itemReq.getPrice();
                }

                // Kiểm tra và trừ tồn kho
                Inventory inv = inventoryRepository.findById(variant.getId()).orElse(null);
                if (inv != null) {
                    if (inv.getAvailableQuantity() < qty) {
                        throw new BadRequestException("Sản phẩm '" + prodName + " (" + varName + ")' chỉ còn " + inv.getAvailableQuantity() + " sản phẩm trong kho!");
                    }
                    inv.setQuantity(Math.max(0, inv.getQuantity() - qty));
                    inventoryRepository.save(inv);
                    log.info("Deducted {} from variant #{} stock. Remaining: {}", qty, variant.getId(), inv.getQuantity());
                }
            } else {
                unitPrice = itemReq.getPrice() != null ? itemReq.getPrice() : BigDecimal.ZERO;
                if (prodName == null || prodName.isBlank()) prodName = "Thiết bị điện tử";
                if (varName == null || varName.isBlank()) varName = "Mặc định";
                if (sku == null || sku.isBlank()) sku = "SKU-" + System.currentTimeMillis();
            }

            if (unitPrice == null) unitPrice = BigDecimal.ZERO;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(lineTotal);

            OrderItem orderItem = OrderItem.builder()
                    .variantId(variant != null ? variant.getId() : null)
                    .productName(prodName)
                    .variantName(varName)
                    .sku(sku)
                    .productImageUrl(imgUrl)
                    .unitPrice(unitPrice)
                    .quantity(qty)
                    .discountAmount(BigDecimal.ZERO)
                    .lineTotal(lineTotal)
                    .build();

            order.addItem(orderItem);
        }

        BigDecimal discountAmount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal shippingFee = request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO;
        BigDecimal totalAmount = subtotal.subtract(discountAmount).add(shippingFee);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);

        Order saved = orderRepository.save(order);
        log.info("Successfully created order #{} ({}) for user #{}", saved.getId(), saved.getOrderCode(), user.getId());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getUserOrders(String currentUsername, OrderStatus status, int page, int size) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để xem danh sách đơn hàng");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        Pageable pageable = PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> orderPage;
        if (status != null) {
            orderPage = orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), status, pageable);
        } else {
            orderPage = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        }

        List<OrderResponse> content = orderPage.getContent().stream().map(this::mapToResponse).toList();
        return PageResponse.<OrderResponse>builder()
                .content(content)
                .page(orderPage.getNumber())
                .size(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .last(orderPage.isLast())
                .first(orderPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderDetail(Long orderId, String currentUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (currentUsername != null && !currentUsername.isBlank()) {
            User user = userRepository.findByUsername(currentUsername).orElse(null);
            if (user != null) {
                boolean isOwner = Objects.equals(order.getUserId(), user.getId());
                boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
                if (!isOwner && !isAdmin) {
                    throw new ForbiddenException("Bạn không có quyền truy cập đơn hàng này");
                }
            }
        }

        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để hủy đơn hàng");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        boolean isOwner = Objects.equals(order.getUserId(), user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền hủy đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BadRequestException("Không thể hủy đơn hàng đang ở trạng thái: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason(reason != null && !reason.isBlank() ? reason : "Người mua yêu cầu hủy đơn");

        // Hoàn lại số lượng tồn kho
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getVariantId() != null) {
                    inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
                        inv.setQuantity(inv.getQuantity() + item.getQuantity());
                        inventoryRepository.save(inv);
                        log.info("Restored {} items back to inventory variant #{}", item.getQuantity(), item.getVariantId());
                    });
                }
            }
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getAdminOrders(Long shopId, OrderStatus status, int page, int size, String currentUsername) {
        verifyAdminOrShopAccess(currentUsername);

        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        Pageable pageable = PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Order> orderPage = orderRepository.findAllByFilter(shopId, status, pageable);
        List<OrderResponse> content = orderPage.getContent().stream().map(this::mapToResponse).toList();

        return PageResponse.<OrderResponse>builder()
                .content(content)
                .page(orderPage.getNumber())
                .size(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .last(orderPage.isLast())
                .first(orderPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request, String currentUsername) {
        verifyAdminOrShopAccess(currentUsername);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        OrderStatus oldStatus = order.getStatus();
        OrderStatus newStatus = request.getStatus();

        if (newStatus != null && newStatus != oldStatus) {
            order.setStatus(newStatus);
            if (newStatus == OrderStatus.CONFIRMED && order.getConfirmedAt() == null) {
                order.setConfirmedAt(LocalDateTime.now());
            } else if (newStatus == OrderStatus.SHIPPED && order.getShippedAt() == null) {
                order.setShippedAt(LocalDateTime.now());
            } else if (newStatus == OrderStatus.DELIVERED && order.getDeliveredAt() == null) {
                order.setDeliveredAt(LocalDateTime.now());
                order.setPaymentStatus(PaymentStatus.PAID);
            } else if (newStatus == OrderStatus.CANCELLED) {
                order.setCancelledAt(LocalDateTime.now());
                order.setCancellationReason(request.getCancellationReason());
                // Hoàn lại tồn kho nếu hủy từ trạng thái chưa giao
                if (oldStatus == OrderStatus.PENDING || oldStatus == OrderStatus.CONFIRMED || oldStatus == OrderStatus.PROCESSING) {
                    if (order.getItems() != null) {
                        for (OrderItem item : order.getItems()) {
                            if (item.getVariantId() != null) {
                                inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
                                    inv.setQuantity(inv.getQuantity() + item.getQuantity());
                                    inventoryRepository.save(inv);
                                });
                            }
                        }
                    }
                }
            }
        }

        if (request.getPaymentStatus() != null) {
            order.setPaymentStatus(request.getPaymentStatus());
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    private void verifyAdminOrShopAccess(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode()) ||
                        "SHOP_MANAGER".equalsIgnoreCase(r.getCode())));

        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hoặc Quản lý cửa hàng mới có quyền thao tác");
        }
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems() != null
                ? order.getItems().stream().map(it -> OrderItemResponse.builder()
                .id(it.getId())
                .variantId(it.getVariantId())
                .productName(it.getProductName())
                .variantName(it.getVariantName())
                .sku(it.getSku())
                .productImageUrl(it.getProductImageUrl())
                .unitPrice(it.getUnitPrice())
                .quantity(it.getQuantity())
                .discountAmount(it.getDiscountAmount())
                .lineTotal(it.getLineTotal())
                .build()).toList()
                : List.of();

        String shopName = null;
        if (order.getShopId() != null) {
            shopName = shopRepository.findById(order.getShopId()).map(Shop::getShopName).orElse(null);
        }

        String userFullName = null;
        String userEmail = null;
        if (order.getUser() != null) {
            userFullName = order.getUser().getFullName();
            userEmail = order.getUser().getEmail();
        }

        return OrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .userId(order.getUserId())
                .userFullName(userFullName)
                .userEmail(userEmail)
                .shopId(order.getShopId())
                .shopName(shopName)
                .addressId(order.getAddressId())
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .shippingAddress(order.getShippingAddress())
                .subtotal(order.getSubtotal())
                .discountAmount(order.getDiscountAmount())
                .shippingFee(order.getShippingFee())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .note(order.getNote())
                .confirmedAt(order.getConfirmedAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .cancellationReason(order.getCancellationReason())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .build();
    }
}

