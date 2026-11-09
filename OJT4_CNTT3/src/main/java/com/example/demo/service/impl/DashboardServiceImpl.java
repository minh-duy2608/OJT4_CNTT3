package com.example.demo.service.impl;

import com.example.demo.dto.response.*;
import com.example.demo.entity.*;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.DashboardService;
import com.example.demo.service.RevenueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final RevenueService revenueService;

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getAdminSummary() {
        List<Order> allOrders = orderRepository.findAll();
        List<Shop> allShops = shopRepository.findAll();
        long totalUsers = userRepository.count();
        long totalProducts = productRepository.count();

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalGmv = BigDecimal.ZERO;
        long deliveredCount = 0;
        long processingCount = 0;
        long cancelledCount = 0;

        for (Order o : allOrders) {
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            if (o.getStatus() == OrderStatus.CANCELLED) {
                cancelledCount++;
            } else {
                totalGmv = totalGmv.add(amt);
                if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                    totalRevenue = totalRevenue.add(amt);
                }
                if (o.getStatus() == OrderStatus.DELIVERED) {
                    deliveredCount++;
                } else {
                    processingCount++;
                }
            }
        }

        long activeShops = allShops.stream().filter(s -> s.getStatus() == ShopStatus.ACTIVE).count();

        return DashboardSummaryResponse.builder()
                .totalRevenue(totalRevenue)
                .totalGmv(totalGmv)
                .totalOrders((long) allOrders.size())
                .deliveredOrders(deliveredCount)
                .processingOrders(processingCount)
                .cancelledOrders(cancelledCount)
                .totalUsers(totalUsers)
                .totalShops((long) allShops.size())
                .activeShops(activeShops)
                .totalProducts(totalProducts)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueResponse getAdminRevenue() {
        return revenueService.getPlatformRevenue(null, "all", null);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderStatsResponse getAdminOrderStats() {
        List<Order> orders = orderRepository.findAll();
        Map<String, Long> statusMap = new LinkedHashMap<>();
        for (OrderStatus st : OrderStatus.values()) {
            statusMap.put(st.name(), 0L);
        }
        for (Order o : orders) {
            String name = o.getStatus().name();
            statusMap.put(name, statusMap.getOrDefault(name, 0L) + 1);
        }
        return OrderStatsResponse.builder()
                .totalOrders((long) orders.size())
                .countByStatus(statusMap)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserStatsResponse getAdminUserStats() {
        List<User> users = userRepository.findAll();
        Map<String, Long> roleMap = new LinkedHashMap<>();
        Map<String, Long> statusMap = new LinkedHashMap<>();

        for (User u : users) {
            String roleName = u.getRole() != null ? u.getRole().name() : "CLIENT";
            roleMap.put(roleName, roleMap.getOrDefault(roleName, 0L) + 1);

            String stName = u.getStatus() != null ? u.getStatus().name() : "ACTIVE";
            statusMap.put(stName, statusMap.getOrDefault(stName, 0L) + 1);
        }

        return UserStatsResponse.builder()
                .totalUsers((long) users.size())
                .countByRole(roleMap)
                .countByStatus(statusMap)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ShopStatsResponse getAdminShopStats() {
        List<Shop> shops = shopRepository.findAll();
        Map<String, Long> statusMap = new LinkedHashMap<>();
        for (ShopStatus st : ShopStatus.values()) {
            statusMap.put(st.name(), 0L);
        }
        for (Shop s : shops) {
            String name = s.getStatus() != null ? s.getStatus().name() : "PENDING";
            statusMap.put(name, statusMap.getOrDefault(name, 0L) + 1);
        }
        return ShopStatsResponse.builder()
                .totalShops((long) shops.size())
                .countByStatus(statusMap)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueReportResponse getAdminRevenueReport(String from, String to, String groupBy) {
        List<Order> orders = orderRepository.findAll();
        return generateRevenueReport(orders, from, to, groupBy);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductResponse> getAdminTopProducts(int limit) {
        int max = limit > 0 ? Math.min(limit, 50) : 10;
        List<OrderItem> items = orderItemRepository.findAll();
        return calculateTopProducts(items, max);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopShopResponse> getAdminTopShops(int limit) {
        int max = limit > 0 ? Math.min(limit, 50) : 10;
        List<Order> orders = orderRepository.findAll();
        List<Shop> shops = shopRepository.findAll();
        Map<Long, Shop> shopMap = shops.stream().collect(Collectors.toMap(Shop::getId, s -> s, (s1, s2) -> s1));

        Map<Long, List<Order>> ordersByShop = orders.stream()
                .filter(o -> o.getShopId() != null)
                .collect(Collectors.groupingBy(Order::getShopId));

        List<TopShopResponse> result = new ArrayList<>();
        for (Shop s : shops) {
            List<Order> shopOrders = ordersByShop.getOrDefault(s.getId(), Collections.emptyList());
            long total = shopOrders.size();
            long delivered = 0;
            BigDecimal rev = BigDecimal.ZERO;
            for (Order o : shopOrders) {
                if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                    rev = rev.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
                }
                if (o.getStatus() == OrderStatus.DELIVERED) {
                    delivered++;
                }
            }
            result.add(TopShopResponse.builder()
                    .shopId(s.getId())
                    .shopName(s.getName())
                    .logoUrl(s.getLogoUrl())
                    .totalOrders(total)
                    .totalDeliveredOrders(delivered)
                    .totalRevenue(rev)
                    .build());
        }

        result.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));
        if (result.size() > max) {
            result = result.subList(0, max);
        }
        return result;
    }

    // 19.2 Shop Dashboard
    @Override
    @Transactional(readOnly = true)
    public ShopDashboardSummaryResponse getShopSummary(Long shopId, String currentUsername) {
        Shop shop = verifyShopPermission(shopId, currentUsername);
        List<Order> orders = orderRepository.findByShopId(shopId);
        long totalProducts = productRepository.countByShopIdAndStatus(shopId, ProductStatus.ACTIVE)
                + productRepository.countByShopIdAndStatus(shopId, ProductStatus.INACTIVE);
        long activeProducts = productRepository.countByShopIdAndStatus(shopId, ProductStatus.ACTIVE);
        long lowStockCount = inventoryRepository.findLowStockByShopId(shopId, 5).size();

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalGmv = BigDecimal.ZERO;
        long delivered = 0;
        long processing = 0;
        long cancelled = 0;

        for (Order o : orders) {
            BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            if (o.getStatus() == OrderStatus.CANCELLED) {
                cancelled++;
            } else {
                totalGmv = totalGmv.add(amt);
                if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                    totalRevenue = totalRevenue.add(amt);
                }
                if (o.getStatus() == OrderStatus.DELIVERED) {
                    delivered++;
                } else {
                    processing++;
                }
            }
        }

        return ShopDashboardSummaryResponse.builder()
                .shopId(shop.getId())
                .shopName(shop.getName())
                .totalRevenue(totalRevenue)
                .totalGmv(totalGmv)
                .totalOrders((long) orders.size())
                .deliveredOrders(delivered)
                .processingOrders(processing)
                .cancelledOrders(cancelled)
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .lowStockItems(lowStockCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueResponse getShopRevenue(Long shopId, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        return revenueService.getPlatformRevenue(shopId, "all", null);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderStatsResponse getShopOrderStats(Long shopId, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        List<Order> orders = orderRepository.findByShopId(shopId);
        Map<String, Long> statusMap = new LinkedHashMap<>();
        for (OrderStatus st : OrderStatus.values()) {
            statusMap.put(st.name(), 0L);
        }
        for (Order o : orders) {
            String name = o.getStatus().name();
            statusMap.put(name, statusMap.getOrDefault(name, 0L) + 1);
        }
        return OrderStatsResponse.builder()
                .totalOrders((long) orders.size())
                .countByStatus(statusMap)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopProductResponse> getShopTopProducts(Long shopId, int limit, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        int max = limit > 0 ? Math.min(limit, 50) : 10;
        List<Order> shopOrders = orderRepository.findByShopId(shopId);
        Set<Long> orderIds = shopOrders.stream().map(Order::getId).collect(Collectors.toSet());

        List<OrderItem> items = orderItemRepository.findAll().stream()
                .filter(it -> it.getOrder() != null && orderIds.contains(it.getOrder().getId()))
                .toList();

        return calculateTopProducts(items, max);
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueReportResponse getShopRevenueReport(Long shopId, String from, String to, String groupBy, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        List<Order> orders = orderRepository.findByShopId(shopId);
        return generateRevenueReport(orders, from, to, groupBy);
    }

    private RevenueReportResponse generateRevenueReport(List<Order> orders, String from, String to, String groupBy) {
        LocalDate startDate = (from != null && !from.isBlank()) ? LocalDate.parse(from) : LocalDate.now().minusDays(30);
        LocalDate endDate = (to != null && !to.isBlank()) ? LocalDate.parse(to) : LocalDate.now();

        DateTimeFormatter formatter = "month".equalsIgnoreCase(groupBy)
                ? DateTimeFormatter.ofPattern("yyyy-MM")
                : DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, BigDecimal> revMap = new TreeMap<>();
        Map<String, Long> countMap = new TreeMap<>();

        BigDecimal grandTotal = BigDecimal.ZERO;
        long totalOrdersCount = 0;

        for (Order o : orders) {
            if (o.getCreatedAt() == null) continue;
            LocalDate orderDate = o.getCreatedAt().toLocalDate();
            if (orderDate.isBefore(startDate) || orderDate.isAfter(endDate)) continue;

            if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                String key = orderDate.format(formatter);
                BigDecimal amt = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                revMap.put(key, revMap.getOrDefault(key, BigDecimal.ZERO).add(amt));
                countMap.put(key, countMap.getOrDefault(key, 0L) + 1);
                grandTotal = grandTotal.add(amt);
                totalOrdersCount++;
            }
        }

        List<RevenueReportResponse.TimePointRevenue> dataPoints = new ArrayList<>();
        for (String k : revMap.keySet()) {
            dataPoints.add(RevenueReportResponse.TimePointRevenue.builder()
                    .date(k)
                    .revenue(revMap.get(k))
                    .orderCount(countMap.getOrDefault(k, 0L))
                    .build());
        }

        return RevenueReportResponse.builder()
                .fromDate(startDate.toString())
                .toDate(endDate.toString())
                .totalRevenue(grandTotal)
                .totalOrders(totalOrdersCount)
                .dataPoints(dataPoints)
                .build();
    }

    private List<TopProductResponse> calculateTopProducts(List<OrderItem> items, int max) {
        Map<String, TopProductResponse> map = new HashMap<>();

        for (OrderItem it : items) {
            if (it.getOrder() != null && it.getOrder().getStatus() == OrderStatus.CANCELLED) {
                continue;
            }
            String key = it.getProductName();
            Long qty = (long) (it.getQuantity() != null ? it.getQuantity() : 1);
            BigDecimal total = it.getLineTotal() != null ? it.getLineTotal() : BigDecimal.ZERO;

            Long prodId = null;
            Long shopId = null;
            String shopName = null;
            if (it.getVariant() != null && it.getVariant().getProduct() != null) {
                prodId = it.getVariant().getProduct().getId();
                shopId = it.getVariant().getProduct().getShopId();
                if (it.getVariant().getProduct().getShop() != null) {
                    shopName = it.getVariant().getProduct().getShop().getName();
                }
            }
            if (shopId == null && it.getOrder() != null) {
                shopId = it.getOrder().getShopId();
            }

            if (map.containsKey(key)) {
                TopProductResponse existing = map.get(key);
                existing.setTotalSoldQuantity(existing.getTotalSoldQuantity() + qty);
                existing.setTotalRevenue(existing.getTotalRevenue().add(total));
            } else {
                map.put(key, TopProductResponse.builder()
                        .productId(prodId)
                        .productName(it.getProductName())
                        .imageUrl(it.getProductImageUrl())
                        .shopId(shopId)
                        .shopName(shopName)
                        .totalSoldQuantity(qty)
                        .totalRevenue(total)
                        .build());
            }
        }

        List<TopProductResponse> list = new ArrayList<>(map.values());
        list.sort((a, b) -> b.getTotalSoldQuantity().compareTo(a.getTotalSoldQuantity()));
        if (list.size() > max) {
            list = list.subList(0, max);
        }
        return list;
    }

    private Shop verifyShopPermission(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);

        if (!isAdmin && !isOwner && !isMember) {
            throw new ForbiddenException("Bạn không có quyền truy cập dữ liệu báo cáo của cửa hàng #" + shopId);
        }
        return shop;
    }
}
