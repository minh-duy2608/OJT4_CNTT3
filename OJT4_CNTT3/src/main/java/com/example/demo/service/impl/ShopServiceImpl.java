package com.example.demo.service.impl;

import com.example.demo.dto.request.AdminUpdateShopStatusRequest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.PublicShopDetailResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.dto.response.ShopManageResponse;
import com.example.demo.dto.response.ShopRevenueDashboardResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.ProductService;
import com.example.demo.service.ShopService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShopServiceImpl implements ShopService {

    private static final String NOT_FOUND_SHOP_PREFIX = "Không tìm thấy cửa hàng #";

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderReturnRepository orderReturnRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final ProductService productService;

    @Override
    @Transactional
    public ShopDetailResponse registerShop(RegisterShopRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);

        // Kiểm tra xem người dùng đã sở hữu cửa hàng nào chưa
        Optional<Shop> existingOpt = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId());
        if (existingOpt.isPresent() && (existingOpt.get().getStatus() == ShopStatus.ACTIVE || existingOpt.get().getStatus() == ShopStatus.PENDING)) {
            Shop existing = existingOpt.get();
            // Khôi phục hoặc đảm bảo người dùng luôn có quyền SHOP_MANAGER & CLIENT để truy cập cửa hàng
            ensureShopManagerRole(user, existing);
            log.info("Tài khoản @{} đã có cửa hàng '{}' (#{}). Tự động đồng bộ quyền SHOP_MANAGER thành công.",
                    currentUsername, existing.getName(), existing.getId());
            return ShopDetailResponse.fromEntity(existing, true, isUserAdmin(user));
        }

        // Tạo mã slug thân thiện URL
        String baseSlug = toSlug(request.getName());
        String finalSlug = baseSlug;
        if (shopRepository.existsBySlug(finalSlug)) {
            finalSlug = baseSlug + "-" + user.getId();
        }
        if (shopRepository.existsBySlug(finalSlug)) {
            finalSlug = baseSlug + "-" + (System.currentTimeMillis() % 10000);
        }

        // Tạo Shop mới với trạng thái ACTIVE để khách hàng và admin có thể trải nghiệm test ngay
        Shop shop = Shop.builder()
                .ownerId(user.getId())
                .name(request.getName().trim())
                .slug(finalSlug)
                .description(request.getDescription())
                .phone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : user.getPhone())
                .email(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim() : user.getEmail())
                .province(request.getProvince())
                .district(request.getDistrict())
                .ward(request.getWard())
                .addressDetail(request.getAddressDetail())
                .logoUrl(request.getLogoUrl())
                .bannerUrl(request.getBannerUrl())
                .status(ShopStatus.ACTIVE)
                .build();

        Shop savedShop = shopRepository.save(shop);

        // Nâng cấp vai trò người dùng thành SHOP_MANAGER nhưng vẫn giữ vai trò CLIENT để dùng cả 2 luồng
        ensureShopManagerRole(user, savedShop);

        log.info("User {} (id: {}) successfully registered shop: {} (id: {})", user.getUsername(), user.getId(), savedShop.getName(), savedShop.getId());
        return ShopDetailResponse.fromEntity(savedShop, true, isUserAdmin(user));
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDetailResponse getMyShop(String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = isUserAdmin(user);

        // Tìm shop do user sở hữu
        Optional<Shop> ownedShop = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId());
        if (ownedShop.isPresent()) {
            return ShopDetailResponse.fromEntity(ownedShop.get(), true, isAdmin);
        }

        // Nếu là ADMIN và chưa tạo shop cá nhân, cho phép quản lý cửa hàng mặc định đầu tiên để kiểm thử tính năng
        if (isAdmin) {
            List<Shop> allShops = shopRepository.findAll();
            if (!allShops.isEmpty()) {
                Shop defaultShop = allShops.get(0);
                return ShopDetailResponse.fromEntity(defaultShop, true, true);
            }
        }

        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopDetailResponse> getMyShops(String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = isUserAdmin(user);

        // Lấy các shop do user sở hữu
        List<Shop> ownedShops = shopRepository.findByOwnerId(user.getId());
        List<ShopDetailResponse> result = new ArrayList<>(ownedShops.stream()
                .map(s -> ShopDetailResponse.fromEntity(s, true, isAdmin))
                .toList());

        // Lấy thêm các shop mà user là thành viên active
        List<ShopMember> memberships = shopMemberRepository.findByIdUserIdAndStatus(user.getId(), ShopMemberStatus.ACTIVE);
        for (ShopMember m : memberships) {
            if (ownedShops.stream().noneMatch(s -> s.getId().equals(m.getId().getShopId()))) {
                Shop shop = shopRepository.findById(m.getId().getShopId()).orElse(null);
                if (shop != null) {
                    result.add(ShopDetailResponse.fromEntity(shop, true, isAdmin));
                }
            }
        }

        // Nếu là ADMIN và chưa có shop nào, fallback cho phép quản lý shop đầu tiên
        if (isAdmin && result.isEmpty()) {
            List<Shop> allShops = shopRepository.findAll();
            if (!allShops.isEmpty()) {
                result.add(ShopDetailResponse.fromEntity(allShops.get(0), true, true));
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public ShopManageResponse getShopManageInfo(Long shopId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = isUserAdmin(user);

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        Optional<ShopMember> membership = shopMemberRepository.findByIdShopIdAndIdUserId(shopId, user.getId());

        if (!isAdmin && !isOwner && (membership.isEmpty() || membership.get().getStatus() != ShopMemberStatus.ACTIVE)) {
            throw new ForbiddenException("Bạn không có quyền quản lý cửa hàng này");
        }

        String roleInShop = resolveUserRoleInShop(isOwner, isAdmin, membership);

        long totalProducts = productRepository.countByShopId(shopId);
        long activeProducts = productRepository.countByShopIdAndStatus(shopId, ProductStatus.ACTIVE);
        long totalOrders = orderRepository.countByShopId(shopId);
        long pendingOrders = orderRepository.countByShopIdAndStatus(shopId, OrderStatus.PENDING);
        long completedOrders = orderRepository.countByShopIdAndStatus(shopId, OrderStatus.DELIVERED);

        List<Order> shopOrders = orderRepository.findByShopId(shopId);
        BigDecimal totalRevenue = shopOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID)
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalMembers = shopMemberRepository.countByIdShopIdAndStatus(shopId, ShopMemberStatus.ACTIVE);
        long lowStockCount = inventoryRepository.findLowStockByShopId(shopId, 10).size();

        return ShopManageResponse.builder()
                .shop(ShopDetailResponse.fromEntity(shop, true, isAdmin))
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .completedOrders(completedOrders)
                .totalRevenue(totalRevenue)
                .totalMembers(totalMembers)
                .lowStockCount(lowStockCount)
                .currentUserRoleInShop(roleInShop)
                .build();
    }

    private String resolveUserRoleInShop(boolean isOwner, boolean isAdmin, Optional<ShopMember> membership) {
        if (isOwner) {
            return "OWNER";
        }
        if (isAdmin) {
            return "ADMIN";
        }
        return membership
                .map(ShopMember::getRole)
                .map(RoleEntity::getCode)
                .orElse("MEMBER");
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopDetailResponse> getAllActiveShops() {
        return shopRepository.findByStatus(ShopStatus.ACTIVE).stream()
                .map(s -> ShopDetailResponse.fromEntity(s, false, false))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDetailResponse getShopById(Long shopId, String currentUsername) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));

        boolean isOwner = false;
        boolean isAdmin = false;

        if (currentUsername != null && !currentUsername.isBlank()) {
            try {
                User user = getCurrentUser(currentUsername);
                isAdmin = isUserAdmin(user);
                isOwner = Objects.equals(shop.getOwnerId(), user.getId());
            } catch (Exception e) {
                log.debug("User context not available for shop detail #{}: {}", shopId, e.getMessage());
            }
        }

        return ShopDetailResponse.fromEntity(shop, isOwner, isAdmin);
    }

    @Override
    @Transactional
    public ShopDetailResponse updateShop(Long shopId, RegisterShopRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));

        boolean isAdmin = isUserAdmin(user);
        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa thông tin cửa hàng này");
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            shop.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            shop.setDescription(request.getDescription());
        }
        if (request.getPhone() != null) {
            shop.setPhone(request.getPhone().trim());
        }
        if (request.getEmail() != null) {
            shop.setEmail(request.getEmail().trim());
        }
        if (request.getProvince() != null) {
            shop.setProvince(request.getProvince());
        }
        if (request.getDistrict() != null) {
            shop.setDistrict(request.getDistrict());
        }
        if (request.getWard() != null) {
            shop.setWard(request.getWard());
        }
        if (request.getAddressDetail() != null) {
            shop.setAddressDetail(request.getAddressDetail());
        }
        if (request.getLogoUrl() != null) {
            shop.setLogoUrl(request.getLogoUrl());
        }
        if (request.getBannerUrl() != null) {
            shop.setBannerUrl(request.getBannerUrl());
        }

        Shop updated = shopRepository.save(shop);
        return ShopDetailResponse.fromEntity(updated, isOwner, isAdmin);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShopDetailResponse> getAdminShops(String keyword, ShopStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<Shop> shopPage = shopRepository.searchShops(kw, status, pageable);
        List<ShopDetailResponse> content = shopPage.getContent().stream()
                .map(s -> ShopDetailResponse.fromEntity(s, false, true))
                .toList();
        return PageResponse.<ShopDetailResponse>builder()
                .content(content)
                .page(shopPage.getNumber())
                .size(shopPage.getSize())
                .totalElements(shopPage.getTotalElements())
                .totalPages(shopPage.getTotalPages())
                .first(shopPage.isFirst())
                .last(shopPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ShopDetailResponse getAdminShopById(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));
        return ShopDetailResponse.fromEntity(shop, false, true);
    }

    @Override
    @Transactional
    public ShopDetailResponse updateShopStatus(Long shopId, AdminUpdateShopStatusRequest request, String adminUsername) {
        User adminUser = getCurrentUser(adminUsername);
        if (!isUserAdmin(adminUser)) {
            throw new ForbiddenException("Chỉ Quản trị viên (ADMIN) mới có quyền thay đổi trạng thái cửa hàng");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));

        ShopStatus oldStatus = shop.getStatus();
        ShopStatus newStatus = request.getStatus();

        shop.setStatus(newStatus);
        shop.setReviewedBy(adminUser.getId());
        shop.setReviewedAt(LocalDateTime.now());
        if (request.getRejectionReason() != null) {
            shop.setRejectionReason(request.getRejectionReason());
        }

        Shop saved = shopRepository.save(shop);
        log.info("Admin {} changed shop #{} status from {} to {}", adminUsername, shopId, oldStatus, newStatus);
        return ShopDetailResponse.fromEntity(saved, false, true);
    }

    private User getCurrentUser(String username) {
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + username));
    }

    private boolean isUserAdmin(User user) {
        if (user == null) return false;
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN) return true;
        return user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode()));
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "shop-" + System.currentTimeMillis();
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("(^-)|(-$)", "");
        return slug.isBlank() ? "shop-" + System.currentTimeMillis() : slug;
    }

    private void ensureShopManagerRole(User user, Shop shop) {
        RoleEntity managerRole = roleRepository.findByCode("SHOP_MANAGER")
                .orElseGet(() -> roleRepository.save(RoleEntity.builder()
                        .code("SHOP_MANAGER")
                        .name("Quản lý shop")
                        .description("Quản lý và vận hành cửa hàng")
                        .isSystem(true)
                        .build()));

        RoleEntity clientRole = roleRepository.findByCode("CLIENT")
                .orElseGet(() -> roleRepository.save(RoleEntity.builder()
                        .code("CLIENT")
                        .name("Khách hàng")
                        .description("Người dùng mua sắm trên sàn")
                        .isSystem(true)
                        .build()));

        if (user.getRoles() == null) {
            user.setRoles(new HashSet<>());
        }
        user.getRoles().add(managerRole);
        user.getRoles().add(clientRole);

        boolean isAdmin = isUserAdmin(user);
        if (!isAdmin) {
            user.setRole(Role.SHOP_MANAGER);
        }
        userRepository.save(user);

        try {
            shopRepository.addShopMember(shop.getId(), user.getId(), managerRole.getId());
        } catch (Exception e) {
            log.warn("Không thể lưu bản ghi shop_members: {}", e.getMessage());
        }
    }

    private static final String REVENUE_RECONCILIATION_RULE = """
            QUY TẮC TÍNH TOÁN & ĐỐI CHIẾU DOANH THU CỬA HÀNG (SHOP REVENUE RECONCILIATION RULE):
            1. Đơn GIAO THÀNH CÔNG (DELIVERED): Tính 100% giá trị thực tế khách hàng thanh toán vào Doanh thu thuần (netRevenue).
            2. Đơn TRẢ HÀNG / HOÀN TIỀN (RETURNED): Ghi nhận Doanh thu gộp (grossRevenue) và khấu trừ số tiền hoàn trả (refundAmount) tương ứng. Doanh thu thuần = Giá trị đơn - Tiền hoàn (nếu hoàn toàn phần thì doanh thu = 0đ).
            3. Đơn ĐÃ HỦY (CANCELLED): Loại trừ hoàn toàn khỏi Doanh thu thuần (netRevenue = 0đ). Ghi nhận vào mục Đơn hủy phục vụ đối chiếu.
            4. Đơn ĐANG XỬ LÝ / VẬN CHUYỂN (PENDING, CONFIRMED, PROCESSING, SHIPPED): Tính vào Doanh thu tạm tính (pendingRevenue), không ghi nhận vào Doanh thu thuần thực nhận.""";

    private record OrderEvaluation(BigDecimal refund, BigDecimal net, String note) {}

    private LocalDateTime resolveOrderReferenceTime(Order order) {
        if (order.getDeliveredAt() != null) {
            return order.getDeliveredAt();
        }
        return order.getCreatedAt() != null ? order.getCreatedAt() : LocalDateTime.now();
    }

    private OrderEvaluation evaluateReturnedOrder(Order order, BigDecimal orderTotal) {
        BigDecimal actualRefund = orderTotal;
        if (orderReturnRepository != null) {
            try {
                List<OrderReturn> returns = orderReturnRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
                if (returns != null && !returns.isEmpty()) {
                    OrderReturn r = returns.get(0);
                    if (r.getRefundAmount() != null && r.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
                        actualRefund = r.getRefundAmount();
                    }
                }
            } catch (Exception e) {
                log.debug("Error querying returns for order #{}: {}", order.getId(), e.getMessage());
            }
        }
        BigDecimal orderRefund = actualRefund.min(orderTotal);
        BigDecimal orderNet = orderTotal.subtract(orderRefund).max(BigDecimal.ZERO);
        String note = String.format("Trả hàng (RETURNED) - Khấu trừ %,.0f đ tiền hoàn, doanh thu còn lại: %,.0f đ",
                orderRefund.doubleValue(), orderNet.doubleValue());
        return new OrderEvaluation(orderRefund, orderNet, note);
    }

    private OrderEvaluation evaluateOrderRevenue(Order order, BigDecimal orderTotal) {
        return switch (order.getStatus()) {
            case CANCELLED -> new OrderEvaluation(BigDecimal.ZERO, BigDecimal.ZERO, "Đơn đã hủy (CANCELLED) - Loại trừ khỏi doanh thu");
            case DELIVERED -> new OrderEvaluation(BigDecimal.ZERO, orderTotal, "Giao hàng thành công (DELIVERED) - Tính 100% doanh thu thuần");
            case RETURNED -> evaluateReturnedOrder(order, orderTotal);
            default -> new OrderEvaluation(BigDecimal.ZERO, BigDecimal.ZERO,
                    String.format("Đang xử lý / Vận chuyển (%s) - Doanh thu tạm tính, chưa ghi nhận doanh thu thực nhận", order.getStatus()));
        };
    }

    @Override
    @Transactional(readOnly = true)
    public ShopRevenueDashboardResponse getShopRevenueDashboard(Long shopId, String from, String to, String groupBy, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));

        LocalDate startDate = (from != null && !from.isBlank()) ? LocalDate.parse(from) : LocalDate.now().minusDays(30);
        LocalDate endDate = (to != null && !to.isBlank()) ? LocalDate.parse(to) : LocalDate.now();

        List<Order> orders = orderRepository.findByShopId(shopId);

        BigDecimal grossRevenue = BigDecimal.ZERO;
        BigDecimal totalRefundAmount = BigDecimal.ZERO;
        BigDecimal netRevenue = BigDecimal.ZERO;
        BigDecimal pendingRevenue = BigDecimal.ZERO;
        BigDecimal cancelledRevenue = BigDecimal.ZERO;

        long deliveredOrders = 0;
        long returnedOrders = 0;
        long cancelledOrders = 0;
        long pendingOrders = 0;
        long totalOrdersInPeriod = 0;

        DateTimeFormatter formatter = "month".equalsIgnoreCase(groupBy)
                ? DateTimeFormatter.ofPattern("yyyy-MM")
                : DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, BigDecimal> chartGrossMap = new TreeMap<>();
        Map<String, BigDecimal> chartRefundMap = new TreeMap<>();
        Map<String, BigDecimal> chartNetMap = new TreeMap<>();
        Map<String, Long> chartCountMap = new TreeMap<>();

        List<ShopRevenueDashboardResponse.OrderReconciliationItem> reconciliations = new ArrayList<>();

        for (Order order : orders) {
            LocalDateTime orderRefTime = resolveOrderReferenceTime(order);
            LocalDate orderDate = orderRefTime.toLocalDate();

            if (orderDate.isBefore(startDate) || orderDate.isAfter(endDate)) {
                continue;
            }

            totalOrdersInPeriod++;
            BigDecimal orderTotal = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            OrderStatus status = order.getStatus();

            OrderEvaluation eval = evaluateOrderRevenue(order, orderTotal);
            BigDecimal orderRefund = eval.refund();
            BigDecimal orderNet = eval.net();
            String note = eval.note();

            if (status == OrderStatus.CANCELLED) {
                cancelledOrders++;
                cancelledRevenue = cancelledRevenue.add(orderTotal);
            } else if (status == OrderStatus.DELIVERED) {
                deliveredOrders++;
                grossRevenue = grossRevenue.add(orderTotal);
                netRevenue = netRevenue.add(orderNet);
            } else if (status == OrderStatus.RETURNED) {
                returnedOrders++;
                grossRevenue = grossRevenue.add(orderTotal);
                totalRefundAmount = totalRefundAmount.add(orderRefund);
                netRevenue = netRevenue.add(orderNet);
            } else {
                pendingOrders++;
                pendingRevenue = pendingRevenue.add(orderTotal);
            }

            if (status == OrderStatus.DELIVERED || status == OrderStatus.RETURNED) {
                String timeKey = orderDate.format(formatter);
                chartGrossMap.put(timeKey, chartGrossMap.getOrDefault(timeKey, BigDecimal.ZERO).add(orderTotal));
                chartRefundMap.put(timeKey, chartRefundMap.getOrDefault(timeKey, BigDecimal.ZERO).add(orderRefund));
                chartNetMap.put(timeKey, chartNetMap.getOrDefault(timeKey, BigDecimal.ZERO).add(orderNet));
                chartCountMap.put(timeKey, chartCountMap.getOrDefault(timeKey, 0L) + 1);
            }

            reconciliations.add(ShopRevenueDashboardResponse.OrderReconciliationItem.builder()
                    .orderId(order.getId())
                    .orderCode(order.getOrderCode())
                    .status(order.getStatus())
                    .paymentStatus(order.getPaymentStatus())
                    .orderTotal(orderTotal)
                    .refundAmount(orderRefund)
                    .netAmount(orderNet)
                    .orderTime(order.getCreatedAt())
                    .deliveredTime(order.getDeliveredAt())
                    .note(note)
                    .build());
        }

        List<ShopRevenueDashboardResponse.RevenueDataPoint> chartData = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : chartGrossMap.entrySet()) {
            String k = entry.getKey();
            chartData.add(ShopRevenueDashboardResponse.RevenueDataPoint.builder()
                    .date(k)
                    .grossRevenue(entry.getValue())
                    .refundAmount(chartRefundMap.get(k))
                    .netRevenue(chartNetMap.get(k))
                    .orderCount(chartCountMap.getOrDefault(k, 0L))
                    .build());
        }

        return ShopRevenueDashboardResponse.builder()
                .shopId(shop.getId())
                .shopName(shop.getName())
                .shopSlug(shop.getSlug())
                .fromDate(startDate.toString())
                .toDate(endDate.toString())
                .groupBy(groupBy != null ? groupBy : "day")
                .grossRevenue(grossRevenue)
                .refundAmount(totalRefundAmount)
                .netRevenue(netRevenue)
                .pendingRevenue(pendingRevenue)
                .cancelledRevenue(cancelledRevenue)
                .totalOrders(totalOrdersInPeriod)
                .deliveredOrders(deliveredOrders)
                .returnedOrders(returnedOrders)
                .cancelledOrders(cancelledOrders)
                .pendingOrders(pendingOrders)
                .revenueRule(REVENUE_RECONCILIATION_RULE)
                .chartData(chartData)
                .orderReconciliations(reconciliations)
                .build();
    }

    private Shop resolveShopByIdentifier(String shopIdentifier) {
        if (shopIdentifier == null || shopIdentifier.isBlank()) {
            throw new BadRequestException("Mã cửa hàng hoặc slug không được để trống");
        }
        String trimmed = shopIdentifier.trim();
        Shop shop = null;
        if (trimmed.matches("^\\d+$")) {
            shop = shopRepository.findById(Long.parseLong(trimmed)).orElse(null);
        }
        if (shop == null) {
            shop = shopRepository.findBySlug(trimmed).orElse(null);
        }
        if (shop == null) {
            throw new ResourceNotFoundException("Không tìm thấy cửa hàng với mã hoặc slug: " + shopIdentifier);
        }
        if (shop.getStatus() != ShopStatus.ACTIVE) {
            throw new BadRequestException("Cửa hàng '" + shop.getName() + "' hiện đang tạm ngừng hoạt động (" + shop.getStatus() + ").");
        }
        return shop;
    }

    @Override
    @Transactional(readOnly = true)
    public PublicShopDetailResponse getPublicShopPage(String shopIdentifier, ProductFilterCriteria criteria) {
        Shop shop = resolveShopByIdentifier(shopIdentifier);

        if (criteria == null) {
            criteria = ProductFilterCriteria.builder().build();
        }
        criteria.setShopId(shop.getId());

        PageResponse<ProductSummaryResponse> productPage = productService.getProducts(criteria);

        List<Product> activeShopProducts = productRepository.findByShopIdAndStatusAndDeletedAtIsNull(
                shop.getId(), ProductStatus.ACTIVE, Pageable.unpaged()).getContent();

        Map<Long, Long> categoryCountMap = activeShopProducts.stream()
                .filter(p -> p.getCategory() != null)
                .collect(Collectors.groupingBy(p -> p.getCategory().getId(), Collectors.counting()));

        List<PublicShopDetailResponse.ShopFilterOption> availableCategories = categoryCountMap.entrySet().stream()
                .map(e -> {
                    Category cat = categoryRepository.findById(e.getKey()).orElse(null);
                    return PublicShopDetailResponse.ShopFilterOption.builder()
                            .id(e.getKey())
                            .name(cat != null ? cat.getName() : "Danh mục #" + e.getKey())
                            .slug(cat != null ? cat.getSlug() : "category-" + e.getKey())
                            .productCount(e.getValue())
                            .build();
                }).toList();

        Map<Long, Long> brandCountMap = activeShopProducts.stream()
                .filter(p -> p.getBrandId() != null)
                .collect(Collectors.groupingBy(Product::getBrandId, Collectors.counting()));

        List<PublicShopDetailResponse.ShopFilterOption> availableBrands = brandCountMap.entrySet().stream()
                .map(e -> {
                    Brand brand = brandRepository.findById(e.getKey()).orElse(null);
                    return PublicShopDetailResponse.ShopFilterOption.builder()
                            .id(e.getKey())
                            .name(brand != null ? brand.getName() : "Thương hiệu #" + e.getKey())
                            .slug(brand != null ? brand.getSlug() : "brand-" + e.getKey())
                            .productCount(e.getValue())
                            .build();
                }).toList();

        return PublicShopDetailResponse.builder()
                .shop(ShopDetailResponse.fromEntity(shop, false, false))
                .products(productPage)
                .availableCategories(availableCategories)
                .availableBrands(availableBrands)
                .totalActiveProducts((long) activeShopProducts.size())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getPublicShopProducts(String shopIdentifier, ProductFilterCriteria criteria) {
        Shop shop = resolveShopByIdentifier(shopIdentifier);
        if (criteria == null) {
            criteria = ProductFilterCriteria.builder().build();
        }
        criteria.setShopId(shop.getId());
        return productService.getProducts(criteria);
    }

    private void verifyShopAccess(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = isUserAdmin(user);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_SHOP_PREFIX + shopId));
        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);

        if (!isAdmin && !isOwner && !isMember) {
            log.warn("Access denied: User '{}' (ID #{}) does not own shop #{} (owner ID #{})",
                    currentUsername, user.getId(), shopId, shop.getOwnerId());
            throw new ForbiddenException("Bạn không có quyền xem thông tin báo cáo doanh thu của cửa hàng này!");
        }
    }
}

