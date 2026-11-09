package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateOrderItemRequest;
import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderItemResponse;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.OrderTrackingResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
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
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
    private final ShopMemberRepository shopMemberRepository;
    private final AuditLogService auditLogService;

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

        // 2. Xác định chính xác shopId từ các sản phẩm được mua
        Long resolvedShopId = request.getShopId();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (CreateOrderItemRequest itemReq : request.getItems()) {
                Product prod = null;
                if (itemReq.getVariantId() != null) {
                    ProductVariant v = productVariantRepository.findById(itemReq.getVariantId()).orElse(null);
                    if (v != null) {
                        prod = v.getProduct();
                    }
                }
                if (prod == null && itemReq.getProductId() != null) {
                    prod = productRepository.findById(itemReq.getProductId()).orElse(null);
                }

                if (prod != null && prod.getShopId() != null) {
                    if (resolvedShopId == null) {
                        resolvedShopId = prod.getShopId();
                    } else if (!resolvedShopId.equals(prod.getShopId())) {
                        throw new BadRequestException("Đơn hàng chỉ được chứa các sản phẩm thuộc cùng một cửa hàng. Sản phẩm '" + prod.getName() + "' thuộc cửa hàng #" + prod.getShopId() + ", khác với cửa hàng #" + resolvedShopId);
                    }
                }
            }
        }

        if (resolvedShopId == null) {
            resolvedShopId = shopRepository.findAll().stream().findFirst().map(Shop::getId).orElse(1L);
        }

        final Long finalShopId = resolvedShopId;
        Shop shop = shopRepository.findById(finalShopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + finalShopId));
        if (shop.getStatus() != ShopStatus.ACTIVE) {
            throw new BadRequestException("Cửa hàng '" + shop.getName() + "' hiện đang tạm ngừng hoạt động (" + shop.getStatus() + "). Không thể tạo đơn hàng mới.");
        }

        // 3. Khởi tạo mã đơn hàng duy nhất
        String orderCode = "CYBER-" + (System.currentTimeMillis() % 1000000) + "-" + ThreadLocalRandom.current().nextInt(100, 999);

        Order order = Order.builder()
                .orderCode(orderCode)
                .userId(user.getId())
                .shopId(shop.getId())
                .shop(shop)
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
                boolean isBuyer = Objects.equals(order.getUserId(), user.getId());
                boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                        (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                                "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));
                boolean isShopManager = isUserShopManagerForOrder(user, order);
                if (!isBuyer && !isAdmin && !isShopManager) {
                    throw new ForbiddenException("Bạn không có quyền truy cập đơn hàng này");
                }
            }
        }

        return mapToResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderTrackingResponse getOrderTracking(Long orderId, String currentUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (currentUsername != null && !currentUsername.isBlank()) {
            User user = userRepository.findByUsername(currentUsername).orElse(null);
            if (user != null) {
                boolean isBuyer = Objects.equals(order.getUserId(), user.getId());
                boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                        (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                                "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));
                boolean isShopManager = isUserShopManagerForOrder(user, order);
                if (!isBuyer && !isAdmin && !isShopManager) {
                    throw new ForbiddenException("Bạn không có quyền theo dõi đơn hàng này");
                }
            }
        }

        String shopName = null;
        if (order.getShop() != null) {
            shopName = order.getShop().getName();
        } else if (order.getShopId() != null) {
            shopName = shopRepository.findById(order.getShopId()).map(Shop::getName).orElse("Shop #" + order.getShopId());
        }

        List<OrderTrackingResponse.TrackingTimelineEvent> timeline = new ArrayList<>();
        OrderStatus currentStatus = order.getStatus();

        // 1. PENDING (Đã đặt đơn)
        timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                .step("PENDING")
                .title("Đặt hàng thành công")
                .description("Đơn hàng #" + order.getOrderCode() + " đã được tạo và chuyển đến cửa hàng " + (shopName != null ? shopName : ""))
                .timestamp(order.getCreatedAt())
                .completed(true)
                .current(currentStatus == OrderStatus.PENDING)
                .build());

        // 2. CONFIRMED (Đã xác nhận)
        boolean isConfirmedDone = order.getConfirmedAt() != null ||
                currentStatus == OrderStatus.CONFIRMED ||
                currentStatus == OrderStatus.PROCESSING ||
                currentStatus == OrderStatus.SHIPPED ||
                currentStatus == OrderStatus.DELIVERED;
        timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                .step("CONFIRMED")
                .title("Cửa hàng xác nhận")
                .description(isConfirmedDone ? "Người bán đã tiếp nhận và xác nhận đơn hàng" : "Chờ cửa hàng kiểm tra và xác nhận đơn")
                .timestamp(order.getConfirmedAt())
                .completed(isConfirmedDone)
                .current(currentStatus == OrderStatus.CONFIRMED)
                .build());

        // 3. PROCESSING (Đang đóng gói)
        boolean isProcessingDone = currentStatus == OrderStatus.PROCESSING ||
                currentStatus == OrderStatus.SHIPPED ||
                currentStatus == OrderStatus.DELIVERED;
        timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                .step("PROCESSING")
                .title("Đang đóng gói")
                .description(isProcessingDone ? "Kiện hàng đã được chuẩn bị và đóng gói niêm phong" : "Cửa hàng chuẩn bị hàng đóng gói")
                .timestamp(order.getConfirmedAt() != null ? order.getConfirmedAt() : null)
                .completed(isProcessingDone)
                .current(currentStatus == OrderStatus.PROCESSING)
                .build());

        // 4. SHIPPED (Đang vận chuyển)
        boolean isShippedDone = order.getShippedAt() != null ||
                currentStatus == OrderStatus.SHIPPED ||
                currentStatus == OrderStatus.DELIVERED;
        timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                .step("SHIPPED")
                .title("Đang vận chuyển")
                .description(isShippedDone ? "Đơn hàng đã bàn giao cho shipper và đang trên đường giao đến bạn" : "Đang chờ bàn giao cho đơn vị vận chuyển")
                .timestamp(order.getShippedAt())
                .completed(isShippedDone)
                .current(currentStatus == OrderStatus.SHIPPED)
                .build());

        // 5. DELIVERED / CANCELLED
        if (currentStatus == OrderStatus.CANCELLED) {
            timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                    .step("CANCELLED")
                    .title("Đơn hàng đã hủy")
                    .description("Đơn hàng đã bị hủy. " + (order.getNote() != null ? "Lý do: " + order.getNote() : ""))
                    .timestamp(order.getCancelledAt() != null ? order.getCancelledAt() : order.getUpdatedAt())
                    .completed(true)
                    .current(true)
                    .build());
        } else {
            boolean isDeliveredDone = order.getDeliveredAt() != null || currentStatus == OrderStatus.DELIVERED;
            timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                    .step("DELIVERED")
                    .title("Giao hàng thành công")
                    .description(isDeliveredDone ? "Đơn hàng đã được giao thành công tới người nhận" : "Đang chờ hoàn tất giao nhận")
                    .timestamp(order.getDeliveredAt())
                    .completed(isDeliveredDone)
                    .current(currentStatus == OrderStatus.DELIVERED)
                    .build());
        }

        String statusDesc = switch (currentStatus) {
            case PENDING -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case PROCESSING -> "Đang đóng gói";
            case SHIPPED -> "Đang vận chuyển";
            case DELIVERED -> "Giao thành công";
            case CANCELLED -> "Đã hủy";
            case RETURNED -> "Đã hoàn trả";
        };

        return OrderTrackingResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .statusDescription(statusDesc)
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
                .shopId(order.getShopId())
                .shopName(shopName)
                .createdAt(order.getCreatedAt())
                .confirmedAt(order.getConfirmedAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .timeline(timeline)
                .build();
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
        User user = verifyAdminOrShopAccess(currentUsername);

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        // Lấy danh sách ID các shop mà user có quyền quản lý (chủ shop hoặc thành viên active)
        List<Long> manageableShopIds = new ArrayList<>();
        shopRepository.findByOwnerId(user.getId()).forEach(s -> manageableShopIds.add(s.getId()));
        shopMemberRepository.findByIdUserIdAndStatus(user.getId(), ShopMemberStatus.ACTIVE)
                .forEach(m -> {
                    if (!manageableShopIds.contains(m.getId().getShopId())) {
                        manageableShopIds.add(m.getId().getShopId());
                    }
                });

        if (!isAdmin) {
            if (manageableShopIds.isEmpty()) {
                return PageResponse.<OrderResponse>builder()
                        .content(List.of())
                        .page(0)
                        .size(size)
                        .totalElements(0)
                        .totalPages(0)
                        .last(true)
                        .first(true)
                        .build();
            }
            if (shopId != null) {
                if (!manageableShopIds.contains(shopId)) {
                    throw new ForbiddenException("Bạn không có quyền quản lý đơn hàng của cửa hàng #" + shopId);
                }
            } else {
                shopId = manageableShopIds.get(0);
            }
        }

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

    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED),
            OrderStatus.PROCESSING, Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
            OrderStatus.SHIPPED, Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            OrderStatus.DELIVERED, Set.of(OrderStatus.RETURNED),
            OrderStatus.CANCELLED, Set.of(),
            OrderStatus.RETURNED, Set.of()
    );

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        Long orderShopId = order.getShopId();
        if (orderShopId == null) {
            throw new BadRequestException("Đơn hàng #" + orderId + " chưa được liên kết với cửa hàng nào");
        }

        Shop shop = shopRepository.findById(orderShopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + orderShopId));

        if (shop.getStatus() == ShopStatus.SUSPENDED) {
            throw new ForbiddenException("Cửa hàng '" + shop.getName() + "' đang bị tạm ngừng kinh doanh (SUSPENDED). Mọi thao tác xử lý đơn hàng bị tạm khóa.");
        }
        if (shop.getStatus() == ShopStatus.REJECTED) {
            throw new ForbiddenException("Cửa hàng '" + shop.getName() + "' đã bị từ chối phê duyệt (REJECTED).");
        }

        // NGHIỆP VỤ CỐT LÕI: Khi người mua hàng mua của shop nào thì CHỈ shop đó (chủ cửa hàng hoặc nhân viên active) mới có quyền chuyển trạng thái đơn hàng.
        // Đối với Quản trị viên hệ thống (Admin): Cho phép can thiệp theo chính sách quản trị, kiểm soát luồng trạng thái hợp lệ và bắt buộc ghi nhật ký thao tác (Audit Log).
        boolean isShopManager = isUserShopManagerForOrder(user, order);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        if (!isShopManager && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền chuyển trạng thái đơn hàng này. Chỉ chủ cửa hàng hoặc nhân viên của cửa hàng '" + shop.getName() + "' (Mã shop: #" + orderShopId + ") hoặc Quản trị viên hệ thống mới có quyền thao tác!");
        }

        return processStatusUpdate(order, shop, request, user, isAdmin, isShopManager);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getShopOrders(Long shopId, OrderStatus status, int page, int size, String currentUsername) {
        verifyShopOrderAccess(shopId, currentUsername);
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
    public OrderResponse updateShopOrderStatus(Long shopId, Long orderId, UpdateOrderStatusRequest request, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (!Objects.equals(order.getShopId(), shopId)) {
            throw new ResourceNotFoundException("Đơn hàng #" + orderId + " không thuộc về cửa hàng #" + shopId);
        }

        if (shop.getStatus() == ShopStatus.SUSPENDED) {
            throw new ForbiddenException("Cửa hàng '" + shop.getName() + "' đang bị tạm ngừng kinh doanh (SUSPENDED). Mọi thao tác xử lý đơn hàng bị tạm khóa.");
        }
        if (shop.getStatus() == ShopStatus.REJECTED) {
            throw new ForbiddenException("Cửa hàng '" + shop.getName() + "' đã bị từ chối phê duyệt (REJECTED).");
        }

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        if (!isOwner && !isMember && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền cập nhật trạng thái đơn hàng của cửa hàng #" + shopId + ". Chỉ chủ sở hữu (Owner) của cửa hàng mới có quyền thao tác!");
        }

        return processStatusUpdate(order, shop, request, user, isAdmin, isOwner || isMember);
    }

    private OrderResponse processStatusUpdate(Order order, Shop shop, UpdateOrderStatusRequest request, User user, boolean isAdmin, boolean isShopManager) {
        OrderStatus oldStatus = order.getStatus();
        OrderStatus newStatus = request.getStatus();

        if (newStatus != null && newStatus != oldStatus) {
            validateStatusTransition(oldStatus, newStatus);
            order.setStatus(newStatus);
            LocalDateTime now = LocalDateTime.now();

            if (newStatus == OrderStatus.CONFIRMED) {
                if (order.getConfirmedAt() == null) {
                    order.setConfirmedAt(now);
                }
                log.info("Xác nhận đơn hàng #{} ({}) của Shop #{} ('{}') vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getConfirmedAt(), user.getUsername());
            } else if (newStatus == OrderStatus.PROCESSING) {
                log.info("Đơn hàng #{} ({}) của Shop #{} đang được chuẩn bị hàng (PROCESSING) vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), now, user.getUsername());
            } else if (newStatus == OrderStatus.SHIPPED) {
                if (order.getShippedAt() == null) {
                    order.setShippedAt(now);
                }
                log.info("Bắt đầu giao đơn hàng #{} ({}) của Shop #{} ('{}') (SHIPPED) vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getShippedAt(), user.getUsername());
            } else if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveredAt(now);
                order.setPaymentStatus(PaymentStatus.PAID);
                log.info("Xác nhận GIAO THÀNH CÔNG (DELIVERED) cho đơn hàng #{} ({}) của Shop #{} ('{}') vào thời điểm: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getDeliveredAt(), user.getUsername());
                auditLogService.log(
                        user.getId(),
                        "ORDER_DELIVERED",
                        "ORDER",
                        String.valueOf(order.getId()),
                        shop.getId(),
                        String.format("Giao thành công đơn hàng #%s vào thời điểm %s bởi %s", order.getOrderCode(), order.getDeliveredAt(), user.getUsername())
                );
            } else if (newStatus == OrderStatus.CANCELLED) {
                order.setCancelledAt(now);
                order.setCancellationReason(request.getCancellationReason() != null ? request.getCancellationReason() : (isAdmin ? "Hủy bởi Quản trị viên" : "Hủy bởi cửa hàng"));
                log.info("Đơn hàng #{} ({}) của Shop #{} bị HỦY (CANCELLED) vào lúc: {}. Lý do: '{}'. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getCancelledAt(), order.getCancellationReason(), user.getUsername());
                // Hoàn lại tồn kho nếu hủy từ trạng thái chưa giao
                if (oldStatus == OrderStatus.PENDING || oldStatus == OrderStatus.CONFIRMED || oldStatus == OrderStatus.PROCESSING) {
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
                }
            } else if (newStatus == OrderStatus.RETURNED) {
                log.info("Đơn hàng #{} ({}) của Shop #{} ghi nhận TRẢ HÀNG (RETURNED) vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), now, user.getUsername());
            }
        }

        if (request.getPaymentStatus() != null) {
            order.setPaymentStatus(request.getPaymentStatus());
        }

        Order saved = orderRepository.save(order);

        // Ghi nhận nhật ký Audit Log nếu Quản trị viên Admin can thiệp đơn hàng
        if (isAdmin && !isShopManager) {
            auditLogService.log(
                    user.getId(),
                    "ADMIN_OVERRIDE_ORDER_STATUS",
                    "ORDER",
                    String.valueOf(order.getId()),
                    shop.getId(),
                    String.format("Admin '%s' can thiệp trạng thái đơn hàng #%s từ %s sang %s. Lý do/Ghi chú: %s",
                            user.getUsername(), order.getOrderCode(), oldStatus, newStatus,
                            request.getCancellationReason() != null ? request.getCancellationReason() : "Quản trị can thiệp")
            );
        }

        log.info("Order #{} ({}) of shop #{} status successfully updated from {} to {} by '{}'",
                saved.getId(), saved.getOrderCode(), shop.getId(), oldStatus, newStatus, user.getUsername());
        return mapToResponse(saved);
    }

    private Shop verifyShopOrderAccess(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
        if (!isOwner && !isMember) {
            throw new ForbiddenException("Bạn không có quyền quản lý đơn hàng của cửa hàng #" + shopId);
        }
        return shop;
    }

    private boolean isUserShopManagerForOrder(User user, Order order) {
        if (user == null || order == null || order.getShopId() == null) {
            return false;
        }
        Long orderShopId = order.getShopId();
        boolean isOwner = shopRepository.findById(orderShopId)
                .map(s -> Objects.equals(s.getOwnerId(), user.getId()))
                .orElse(false);
        if (isOwner) {
            return true;
        }
        return shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(orderShopId, user.getId(), ShopMemberStatus.ACTIVE);
    }

    private void validateStatusTransition(OrderStatus oldStatus, OrderStatus newStatus) {
        if (oldStatus == null || newStatus == null || oldStatus == newStatus) {
            return;
        }
        if (oldStatus == OrderStatus.CANCELLED) {
            throw new BadRequestException("Đơn hàng đã ở trạng thái ĐÃ HỦY (CANCELLED), không thể thay đổi trạng thái!");
        }
        if (oldStatus == OrderStatus.RETURNED) {
            throw new BadRequestException("Đơn hàng đã ở trạng thái ĐÃ TRẢ HÀNG (RETURNED), không thể thay đổi trạng thái!");
        }
        if (oldStatus == OrderStatus.DELIVERED && newStatus != OrderStatus.RETURNED) {
            throw new BadRequestException("Đơn hàng đã GIAO THÀNH CÔNG (DELIVERED), không thể chuyển ngược lại trạng thái " + newStatus + "!");
        }
        Set<OrderStatus> allowedNext = VALID_TRANSITIONS.getOrDefault(oldStatus, Set.of());
        if (!allowedNext.contains(newStatus)) {
            throw new BadRequestException(String.format("Không thể chuyển trạng thái đơn hàng từ '%s' sang '%s'. Luồng chuyển trạng thái không hợp lệ!", oldStatus, newStatus));
        }
    }

    private User verifyAdminOrShopAccess(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        boolean hasAccess = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode()) ||
                        "SHOP_MANAGER".equalsIgnoreCase(r.getCode()) || "ROLE_SHOP_MANAGER".equalsIgnoreCase(r.getCode()) ||
                        "SHOP_OWNER".equalsIgnoreCase(r.getCode())));

        if (!hasAccess) {
            throw new ForbiddenException("Chỉ Quản trị viên hoặc Quản lý cửa hàng mới có quyền thao tác");
        }
        return user;
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

