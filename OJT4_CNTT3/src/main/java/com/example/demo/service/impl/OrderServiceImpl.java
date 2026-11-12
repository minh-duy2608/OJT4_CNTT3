package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateOrderItemRequest;
import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderItemResponse;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.OrderTrackingResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ReturnResponse;
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
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String ROLE_ADMIN_STR = "ADMIN";
    private static final String ROLE_ROLE_ADMIN_STR = "ROLE_ADMIN";
    private static final String ENTITY_ORDER = "ORDER";
    private static final String REQ_LOGIN = "Yêu cầu đăng nhập";

    private static final String DEFAULT_RETURN_INSTRUCTIONS = """
            1. Quý khách có thể gửi yêu cầu Trả hàng / Hoàn tiền trong vòng 3 ngày kể từ khi nhận hàng thành công.
            2. Sản phẩm đổi trả phải còn nguyên tem niêm phong, phụ kiện, hộp đóng gói và chưa qua sửa chữa hoặc can thiệp kỹ thuật.
            3. Vui lòng quay video lúc mở kiện hàng và chụp ảnh chi tiết lỗi để Shop đối soát và xử lý hoàn tiền nhanh nhất.""";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final AddressRepository addressRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final OrderReturnRepository orderReturnRepository;
    private final ProductReviewRepository productReviewRepository;
    private final AuditLogService auditLogService;

    private record RecipientInfo(String name, String phone, String address, Long addressId) {}

    private RecipientInfo resolveRecipientInfo(CreateOrderRequest request, User user) {
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
        return new RecipientInfo(recipientName, recipientPhone, shippingAddress, addressId);
    }

    private Product resolveProductForItem(CreateOrderItemRequest itemReq) {
        if (itemReq.getVariantId() != null) {
            ProductVariant v = productVariantRepository.findById(itemReq.getVariantId()).orElse(null);
            if (v != null) {
                return v.getProduct();
            }
        }
        if (itemReq.getProductId() != null) {
            return productRepository.findById(itemReq.getProductId()).orElse(null);
        }
        return null;
    }

    private Long resolveShopId(CreateOrderRequest request) {
        Long resolvedShopId = request.getShopId();
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (CreateOrderItemRequest itemReq : request.getItems()) {
                Product prod = resolveProductForItem(itemReq);
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
        return resolvedShopId;
    }

    private OrderItem buildOrderItemAndDeductInventory(CreateOrderItemRequest itemReq) {
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
        String prodName = (itemReq.getProductName() != null && !itemReq.getProductName().isBlank())
                ? itemReq.getProductName()
                : (product != null ? product.getName() : "Sản phẩm Cyber");
        String varName = (itemReq.getVariantName() != null && !itemReq.getVariantName().isBlank())
                ? itemReq.getVariantName()
                : (variant != null && variant.getVariantName() != null ? variant.getVariantName() : "Tiêu chuẩn");

        if (product != null && (product.getStatus() != ProductStatus.ACTIVE || product.getDeletedAt() != null)) {
            throw new BadRequestException("Sản phẩm '" + product.getName() + "' hiện đã ngừng kinh doanh hoặc không còn tồn tại trên hệ thống!");
        }

        if (variant == null) {
            throw new BadRequestException("Không tìm thấy phiên bản hợp lệ cho sản phẩm '" + prodName + "'!");
        }
        if (variant.getStatus() != ProductVariantStatus.ACTIVE) {
            throw new BadRequestException("Phiên bản '" + varName + "' của sản phẩm '" + prodName + "' hiện đã ngừng kinh doanh!");
        }

        String sku = (itemReq.getSku() != null && !itemReq.getSku().isBlank())
                ? itemReq.getSku()
                : (variant.getSku() != null ? variant.getSku() : "SKU-" + variant.getId());
        String imgUrl = (itemReq.getImageUrl() != null && !itemReq.getImageUrl().isBlank())
                ? itemReq.getImageUrl()
                : (product != null ? product.getPrimaryImageUrl() : null);

        BigDecimal unitPrice = variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice();
        if (unitPrice == null && itemReq.getPrice() != null) {
            unitPrice = itemReq.getPrice();
        }
        if (unitPrice == null) {
            unitPrice = BigDecimal.ZERO;
        }

        Inventory inv = inventoryRepository.findById(variant.getId()).orElse(null);
        if (inv == null || inv.getAvailableQuantity() <= 0) {
            throw new BadRequestException("Sản phẩm '" + prodName + " (" + varName + ")' hiện đã hết hàng trong kho. Không thể đặt mua!");
        }
        if (inv.getAvailableQuantity() < qty) {
            throw new BadRequestException("Sản phẩm '" + prodName + " (" + varName + ")' chỉ còn " + inv.getAvailableQuantity() + " sản phẩm trong kho (bạn đang đặt " + qty + ")!");
        }

        inv.setQuantity(Math.max(0, inv.getQuantity() - qty));
        inventoryRepository.save(inv);
        log.info("Deducted {} from variant #{} stock. Remaining: {}", qty, variant.getId(), inv.getQuantity());

        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

        return OrderItem.builder()
                .variantId(variant.getId())
                .productName(prodName)
                .variantName(varName)
                .sku(sku)
                .productImageUrl(imgUrl)
                .unitPrice(unitPrice)
                .quantity(qty)
                .discountAmount(BigDecimal.ZERO)
                .lineTotal(lineTotal)
                .build();
    }

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

        RecipientInfo recipient = resolveRecipientInfo(request, user);
        Long finalShopId = resolveShopId(request);

        Shop shop = shopRepository.findById(finalShopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + finalShopId));
        if (shop.getStatus() != ShopStatus.ACTIVE) {
            throw new BadRequestException("Cửa hàng '" + shop.getName() + "' hiện đang tạm ngừng hoạt động (" + shop.getStatus() + "). Không thể tạo đơn hàng mới.");
        }

        String orderCode = "CYBER-" + (System.currentTimeMillis() % 1000000) + "-" + (100 + SECURE_RANDOM.nextInt(900));

        Order order = Order.builder()
                .orderCode(orderCode)
                .userId(user.getId())
                .shopId(shop.getId())
                .shop(shop)
                .addressId(recipient.addressId())
                .recipientName(recipient.name())
                .recipientPhone(recipient.phone())
                .shippingAddress(recipient.address())
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "COD")
                .note(request.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateOrderItemRequest itemReq : request.getItems()) {
            OrderItem orderItem = buildOrderItemAndDeductInventory(itemReq);
            subtotal = subtotal.add(orderItem.getLineTotal());
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

        List<OrderResponse> content = orderPage.getContent().stream()
                .map(o -> mapToDetailedResponse(o, user.getId()))
                .toList();
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

    private boolean isUserAdmin(User user) {
        if (user == null) {
            return false;
        }
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN) {
            return true;
        }
        return user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                ROLE_ADMIN_STR.equalsIgnoreCase(r.getCode()) || ROLE_ROLE_ADMIN_STR.equalsIgnoreCase(r.getCode()));
    }

    private void restoreInventory(Order order) {
        if (order.getItems() == null) {
            return;
        }
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

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderDetail(Long orderId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để xem thông tin chi tiết đơn hàng");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        boolean isBuyer = Objects.equals(order.getUserId(), user.getId());
        boolean isAdmin = isUserAdmin(user);
        boolean isShopManager = isUserShopManagerForOrder(user, order);
        if (!isBuyer && !isAdmin && !isShopManager) {
            log.warn("Access denied for user '{}' (ID #{}) to order #{}", currentUsername, user.getId(), orderId);
            throw new ForbiddenException("Bạn không có quyền truy cập thông tin chi tiết đơn hàng này");
        }

        return mapToDetailedResponse(order, user.getId());
    }

    @Override
    @Transactional
    public OrderResponse confirmOrderDelivery(Long orderId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để xác nhận nhận hàng");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        // 1. Chỉ khách hàng sở hữu đơn mới được xác nhận nhận hàng
        if (!Objects.equals(order.getUserId(), user.getId())) {
            log.warn("User #{} ('{}') attempted to confirm delivery for order #{} owned by user #{}",
                    user.getId(), user.getUsername(), order.getId(), order.getUserId());
            throw new ForbiddenException("Bạn không có quyền xác nhận đơn hàng của người khác!");
        }

        // 2. Chống xác nhận lặp (đã xác nhận trước đó) - Xử lý idempotent: nếu đã xác nhận thành công trước đó thì trả về đơn hiện tại
        if (Boolean.TRUE.equals(order.getBuyerConfirmedDelivery())) {
            log.info("Order #{} ({}) has already been confirmed as delivered by user '{}'. Returning current order state.",
                    order.getId(), order.getOrderCode(), user.getUsername());
            return mapToDetailedResponse(order, user.getId());
        }

        // 3. Cho phép xác nhận khi đơn đang ở trạng thái SHIPPED hoặc DELIVERED (chưa bấm xác nhận)
        if (order.getStatus() != OrderStatus.SHIPPED && order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể xác nhận nhận hàng khi đơn hàng đang ở trạng thái đang giao hoặc đã giao. Trạng thái hiện tại: " + order.getStatus());
        }

        // 4. Chuyển DELIVERED, ghi buyerConfirmedDelivery, deliveredAt, cập nhật paymentStatus
        LocalDateTime now = LocalDateTime.now();
        order.setBuyerConfirmedDelivery(true);
        order.setStatus(OrderStatus.DELIVERED);
        if (order.getDeliveredAt() == null) {
            order.setDeliveredAt(now);
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setUpdatedAt(now);

        Order saved = orderRepository.save(order);
        log.info("Customer '{}' (User #{}) confirmed delivery for order #{} ({}) at {}",
                user.getUsername(), user.getId(), saved.getId(), saved.getOrderCode(), now);

        // 5. Ghi Audit Log
        auditLogService.log(
                user.getId(),
                "CUSTOMER_CONFIRMED_DELIVERY",
                "ORDER",
                String.valueOf(saved.getId()),
                saved.getShopId(),
                String.format("Khách hàng '%s' (ID #%d) đã xác nhận nhận hàng thành công cho đơn #%s",
                        user.getUsername(), user.getId(), saved.getOrderCode())
        );

        return mapToDetailedResponse(saved, user.getId());
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
                boolean isAdmin = isUserAdmin(user);
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

        List<OrderTrackingResponse.TrackingTimelineEvent> timeline = buildOrderTimeline(order, shopName);
        OrderStatus currentStatus = order.getStatus();

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
        boolean isAdmin = isUserAdmin(user);
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
        restoreInventory(order);

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getAdminOrders(Long shopId, OrderStatus status, int page, int size, String currentUsername) {
        User user = verifyAdminOrShopAccess(currentUsername);

        boolean isAdmin = isUserAdmin(user);

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
            throw new UnauthorizedException(REQ_LOGIN);
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
        boolean isAdmin = isUserAdmin(user);

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
            throw new UnauthorizedException(REQ_LOGIN);
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
        boolean isAdmin = isUserAdmin(user);

        if (!isOwner && !isMember && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền cập nhật trạng thái đơn hàng của cửa hàng #" + shopId + ". Chỉ chủ sở hữu (Owner) của cửa hàng mới có quyền thao tác!");
        }

        return processStatusUpdate(order, shop, request, user, isAdmin, isOwner || isMember);
    }

    private void handleStatusConfirmed(Order order, Shop shop, User user, LocalDateTime now) {
        if (order.getConfirmedAt() == null) {
            order.setConfirmedAt(now);
        }
        log.info("Xác nhận đơn hàng #{} ({}) của Shop #{} ('{}') vào lúc: {}. Người thực hiện: '{}'",
                order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getConfirmedAt(), user.getUsername());
    }

    private void handleStatusShipped(Order order, Shop shop, User user, LocalDateTime now) {
        if (order.getShippedAt() == null) {
            order.setShippedAt(now);
        }
        log.info("Bắt đầu giao đơn hàng #{} ({}) của Shop #{} ('{}') (SHIPPED) vào lúc: {}. Người thực hiện: '{}'",
                order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getShippedAt(), user.getUsername());
    }

    private void handleStatusDelivered(Order order, Shop shop, User user, LocalDateTime now) {
        order.setDeliveredAt(now);
        order.setPaymentStatus(PaymentStatus.PAID);
        log.info("Xác nhận GIAO THÀNH CÔNG (DELIVERED) cho đơn hàng #{} ({}) của Shop #{} ('{}') vào thời điểm: {}. Người thực hiện: '{}'",
                order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getDeliveredAt(), user.getUsername());
        auditLogService.log(
                user.getId(),
                "ORDER_DELIVERED",
                ENTITY_ORDER,
                String.valueOf(order.getId()),
                shop.getId(),
                String.format("Giao thành công đơn hàng #%s vào thời điểm %s bởi %s", order.getOrderCode(), order.getDeliveredAt(), user.getUsername())
        );
    }

    private String resolveCancellationReason(UpdateOrderStatusRequest request, boolean isAdmin) {
        if (request.getCancellationReason() != null && !request.getCancellationReason().isBlank()) {
            return request.getCancellationReason();
        }
        return isAdmin ? "Hủy bởi Quản trị viên" : "Hủy bởi cửa hàng";
    }

    private void handleStatusCancelled(Order order, Shop shop, UpdateOrderStatusRequest request, User user, boolean isAdmin, LocalDateTime now, OrderStatus oldStatus) {
        order.setCancelledAt(now);
        order.setCancellationReason(resolveCancellationReason(request, isAdmin));
        log.info("Đơn hàng #{} ({}) của Shop #{} bị HỦY (CANCELLED) vào lúc: {}. Lý do: '{}'. Người thực hiện: '{}'",
                order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), order.getCancelledAt(), order.getCancellationReason(), user.getUsername());
        if (oldStatus == OrderStatus.PENDING || oldStatus == OrderStatus.CONFIRMED || oldStatus == OrderStatus.PROCESSING) {
            restoreInventory(order);
        }
    }

    private OrderResponse processStatusUpdate(Order order, Shop shop, UpdateOrderStatusRequest request, User user, boolean isAdmin, boolean isShopManager) {
        OrderStatus oldStatus = order.getStatus();
        OrderStatus newStatus = request.getStatus();

        if (newStatus != null && newStatus != oldStatus) {
            validateStatusTransition(oldStatus, newStatus);
            order.setStatus(newStatus);
            LocalDateTime now = LocalDateTime.now();

            switch (newStatus) {
                case CONFIRMED -> handleStatusConfirmed(order, shop, user, now);
                case PROCESSING -> log.info("Đơn hàng #{} ({}) của Shop #{} đang được chuẩn bị hàng (PROCESSING) vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), now, user.getUsername());
                case SHIPPED -> handleStatusShipped(order, shop, user, now);
                case DELIVERED -> handleStatusDelivered(order, shop, user, now);
                case CANCELLED -> handleStatusCancelled(order, shop, request, user, isAdmin, now, oldStatus);
                case RETURNED -> log.info("Đơn hàng #{} ({}) của Shop #{} ghi nhận TRẢ HÀNG (RETURNED) vào lúc: {}. Người thực hiện: '{}'",
                        order.getId(), order.getOrderCode(), shop.getId(), shop.getName(), now, user.getUsername());
                default -> { /* PENDING or other unhandled */ }
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
                    ENTITY_ORDER,
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
            throw new UnauthorizedException(REQ_LOGIN);
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
            throw new UnauthorizedException(REQ_LOGIN);
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        boolean hasAccess = isUserAdmin(user) ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "SHOP_MANAGER".equalsIgnoreCase(r.getCode()) || "ROLE_SHOP_MANAGER".equalsIgnoreCase(r.getCode()) ||
                        "SHOP_OWNER".equalsIgnoreCase(r.getCode())));

        if (!hasAccess) {
            throw new ForbiddenException("Chỉ Quản trị viên hoặc Quản lý cửa hàng mới có quyền thao tác");
        }
        return user;
    }

    private String resolveTimelineCancelDescription(Order order) {
        if (order.getCancellationReason() != null && !order.getCancellationReason().isBlank()) {
            return "Lý do: " + order.getCancellationReason();
        }
        if (order.getNote() != null && !order.getNote().isBlank()) {
            return order.getNote();
        }
        return "";
    }

    private List<OrderTrackingResponse.TrackingTimelineEvent> buildOrderTimeline(Order order, String shopName) {
        List<OrderTrackingResponse.TrackingTimelineEvent> timeline = new ArrayList<>();
        OrderStatus currentStatus = order.getStatus();

        // 1. PENDING (Đã đặt đơn)
        timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                .step("PENDING")
                .title("Đặt hàng thành công")
                .description("Đơn hàng #" + order.getOrderCode() + " đã được tạo" + (shopName != null ? " và chuyển đến cửa hàng " + shopName : ""))
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
                .description(isShippedDone ? "Đơn hàng đã bàn giao cho đơn vị vận chuyển và đang trên đường giao đến bạn" : "Đang chờ bàn giao cho shipper")
                .timestamp(order.getShippedAt())
                .completed(isShippedDone)
                .current(currentStatus == OrderStatus.SHIPPED)
                .build());

        // 5. Kết thúc: CANCELLED / RETURNED / DELIVERED
        if (currentStatus == OrderStatus.CANCELLED) {
            timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                    .step("CANCELLED")
                    .title("Đơn hàng đã hủy")
                    .description("Đơn hàng đã bị hủy. " + resolveTimelineCancelDescription(order))
                    .timestamp(order.getCancelledAt() != null ? order.getCancelledAt() : order.getUpdatedAt())
                    .completed(true)
                    .current(true)
                    .build());
        } else if (currentStatus == OrderStatus.RETURNED) {
            timeline.add(OrderTrackingResponse.TrackingTimelineEvent.builder()
                    .step("RETURNED")
                    .title("Đã hoàn trả hàng")
                    .description("Đơn hàng đã được hoàn trả / hoàn tiền thành công")
                    .timestamp(order.getUpdatedAt())
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

        return timeline;
    }

    private ReturnResponse mapToReturnResponse(OrderReturn r, Order order, String shopName) {
        if (r == null) return null;
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

        return ReturnResponse.builder()
                .id(r.getId())
                .orderId(r.getOrderId() != null ? r.getOrderId() : order.getId())
                .orderCode(order.getOrderCode())
                .shopId(order.getShopId())
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

    private OrderResponse mapToDetailedResponse(Order order, Long currentUserId) {
        String shopName = null;
        if (order.getShop() != null) {
            shopName = order.getShop().getName();
        } else if (order.getShopId() != null) {
            shopName = shopRepository.findById(order.getShopId()).map(Shop::getShopName).orElse(null);
        }

        String userFullName = null;
        String userEmail = null;
        if (order.getUser() != null) {
            userFullName = order.getUser().getFullName();
            userEmail = order.getUser().getEmail();
        }

        // 1. Timeline hành trình đơn hàng
        List<OrderTrackingResponse.TrackingTimelineEvent> timeline = buildOrderTimeline(order, shopName);

        // 2. Chi tiết items kèm productId và cờ isReviewed (phục vụ viết đánh giá)
        List<OrderItemResponse> itemResponses = order.getItems() != null
                ? order.getItems().stream().map(it -> {
                    Long productId = null;
                    if (it.getVariant() != null && it.getVariant().getProduct() != null) {
                        productId = it.getVariant().getProduct().getId();
                    } else if (it.getVariantId() != null) {
                        productId = productVariantRepository.findById(it.getVariantId())
                                .map(ProductVariant::getProduct)
                                .map(Product::getId)
                                .orElse(null);
                    }

                    Boolean isReviewed = null;
                    if (currentUserId != null && productId != null && productReviewRepository != null) {
                        try {
                            isReviewed = productReviewRepository.existsByProductIdAndUserId(productId, currentUserId);
                        } catch (Exception e) {
                            log.debug("Could not determine review status for product #{}: {}", productId, e.getMessage());
                        }
                    }

                    return OrderItemResponse.builder()
                            .id(it.getId())
                            .variantId(it.getVariantId())
                            .productId(productId)
                            .productName(it.getProductName())
                            .variantName(it.getVariantName())
                            .sku(it.getSku())
                            .productImageUrl(it.getProductImageUrl())
                            .unitPrice(it.getUnitPrice())
                            .quantity(it.getQuantity())
                            .discountAmount(it.getDiscountAmount())
                            .lineTotal(it.getLineTotal())
                            .isReviewed(isReviewed)
                            .build();
                }).toList()
                : List.of();

        // 3. Yêu cầu đổi trả / hoàn tiền (nếu có)
        ReturnResponse returnResponse = null;
        OrderReturn latestReturn = null;
        if (orderReturnRepository != null && order.getId() != null) {
            try {
                List<OrderReturn> returns = orderReturnRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
                if (returns != null && !returns.isEmpty()) {
                    latestReturn = returns.get(0);
                    returnResponse = mapToReturnResponse(latestReturn, order, shopName);
                }
            } catch (Exception e) {
                log.debug("Could not fetch return requests for order #{}: {}", order.getId(), e.getMessage());
            }
        }

        // 4. Các cờ điều kiện thao tác
        boolean isDelivered = order.getStatus() == OrderStatus.DELIVERED;
        boolean buyerConfirmed = Boolean.TRUE.equals(order.getBuyerConfirmedDelivery());

        // Nếu đơn hàng đang SHIPPED hoặc DELIVERED nhưng khách chưa bấm nút xác nhận nhận hàng:
        boolean canConfirmDelivery = !buyerConfirmed && (order.getStatus() == OrderStatus.SHIPPED || isDelivered);
        boolean canCancel = order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED;

        boolean isWithinReturnWindow = order.getDeliveredAt() == null ||
                order.getDeliveredAt().isAfter(LocalDateTime.now().minusDays(7));
        boolean noActiveReturn = latestReturn == null ||
                latestReturn.getStatus() == ReturnStatus.REJECTED ||
                latestReturn.getStatus() == ReturnStatus.CANCELLED;

        // Chỉ khi khách đã bấm xác nhận nhận hàng (buyerConfirmed) mới được phép Đánh giá hoặc Yêu cầu hoàn hàng
        boolean canReturn = buyerConfirmed && isDelivered && isWithinReturnWindow && noActiveReturn;
        boolean canReview = buyerConfirmed && isDelivered;
        String reviewConditionMessage = canReview
                ? "Đơn hàng đã được giao và xác nhận thành công. Quý khách có thể viết đánh giá & nhận xét chất lượng sản phẩm."
                : "Chỉ đơn hàng đã giao và được khách hàng xác nhận nhận hàng mới đủ điều kiện đánh giá hoặc đổi trả.";

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
                .timeline(timeline)
                .buyerConfirmedDelivery(buyerConfirmed)
                .canConfirmDelivery(canConfirmDelivery)
                .canCancel(canCancel)
                .canReturn(canReturn)
                .canReview(canReview)
                .reviewConditionMessage(reviewConditionMessage)
                .returnRequest(returnResponse)
                .returnInstructions(DEFAULT_RETURN_INSTRUCTIONS)
                .build();
    }

    private OrderResponse mapToResponse(Order order) {
        return mapToDetailedResponse(order, order.getUserId());
    }
}

