package com.example.demo.service.impl;

import com.example.demo.dto.response.AdminRevenueResponse;
import com.example.demo.dto.response.AdminRevenueResponse.DailyRevenueSummary;
import com.example.demo.dto.response.AdminRevenueResponse.RecentOrderSummary;
import com.example.demo.dto.response.AdminRevenueResponse.ShopRevenueSummary;
import com.example.demo.entity.*;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.RevenueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RevenueServiceImpl implements RevenueService {

    private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE = new BigDecimal("0.025");
    private static final String ROLE_ADMIN_STR = "ADMIN";
    private static final String ROLE_ROLE_ADMIN_STR = "ROLE_ADMIN";

    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueResponse getPlatformRevenue(Long targetShopId, String timeRange, String currentUsername) {
        verifyAdminAccess(currentUsername);

        List<Order> allOrders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Shop> allShops = shopRepository.findAll();
        Map<Long, Shop> shopMap = allShops.stream().collect(Collectors.toMap(Shop::getId, s -> s, (s1, s2) -> s1));

        List<Order> filteredOrders = (targetShopId != null)
                ? allOrders.stream().filter(o -> targetShopId.equals(o.getShopId())).toList()
                : allOrders;

        PlatformMetrics metrics = calculatePlatformTotals(filteredOrders);

        Map<Long, List<Order>> ordersByShop = allOrders.stream()
                .filter(o -> o.getShopId() != null)
                .collect(Collectors.groupingBy(Order::getShopId));

        List<ShopRevenueSummary> shopRevenues = buildShopRevenueSummaries(allShops, ordersByShop);
        List<DailyRevenueSummary> dailyRevenues = calculateDailyRevenues(filteredOrders);
        List<RecentOrderSummary> recentOrders = mapRecentOrders(filteredOrders, shopMap);

        return AdminRevenueResponse.builder()
                .totalRevenue(metrics.totalRevenue())
                .grossMerchandiseValue(metrics.grossMerchandiseValue())
                .totalPlatformFee(metrics.totalPlatformFee())
                .totalOrders(metrics.totalOrders())
                .completedOrders(metrics.completedOrders())
                .processingOrders(metrics.processingOrders())
                .cancelledOrders(metrics.cancelledOrders())
                .averageOrderValue(metrics.averageOrderValue())
                .shopRevenues(shopRevenues)
                .dailyRevenues(dailyRevenues)
                .recentOrders(recentOrders)
                .build();
    }

    private record PlatformMetrics(
            BigDecimal totalRevenue,
            BigDecimal grossMerchandiseValue,
            BigDecimal totalPlatformFee,
            long totalOrders,
            long completedOrders,
            long processingOrders,
            long cancelledOrders,
            BigDecimal averageOrderValue
    ) {}

    private static class PlatformMetricsAccumulator {
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal grossMerchandiseValue = BigDecimal.ZERO;
        BigDecimal totalPlatformFee = BigDecimal.ZERO;
        long completedOrders = 0;
        long processingOrders = 0;
        long cancelledOrders = 0;

        void processOrder(Order order, BigDecimal fee) {
            OrderStatus status = order.getStatus();
            if (status == OrderStatus.CANCELLED || status == OrderStatus.RETURNED || order.getPaymentStatus() == PaymentStatus.REFUNDED) {
                if (status == OrderStatus.CANCELLED) {
                    cancelledOrders++;
                }
                return;
            }

            BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            grossMerchandiseValue = grossMerchandiseValue.add(amount);

            if (status == OrderStatus.DELIVERED || order.getPaymentStatus() == PaymentStatus.PAID) {
                totalRevenue = totalRevenue.add(amount);
                totalPlatformFee = totalPlatformFee.add(fee);
            }

            if (status == OrderStatus.DELIVERED) {
                completedOrders++;
            } else {
                processingOrders++;
            }
        }
    }

    private BigDecimal calculateOrderPlatformFee(Order order) {
        if (order.getPlatformFee() != null && order.getPlatformFee().compareTo(BigDecimal.ZERO) > 0) {
            return order.getPlatformFee();
        }
        BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal ship = order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO;
        BigDecimal prod = amount.subtract(ship).max(BigDecimal.ZERO);
        return prod.multiply(DEFAULT_PLATFORM_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAverageOrderValue(BigDecimal gmv, long totalOrders) {
        if (totalOrders <= 0) {
            return BigDecimal.ZERO;
        }
        return gmv.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP);
    }

    private PlatformMetrics calculatePlatformTotals(List<Order> orders) {
        PlatformMetricsAccumulator acc = new PlatformMetricsAccumulator();

        for (Order order : orders) {
            BigDecimal fee = calculateOrderPlatformFee(order);
            acc.processOrder(order, fee);
        }

        long totalOrders = orders.size();
        BigDecimal averageOrderValue = calculateAverageOrderValue(acc.grossMerchandiseValue, totalOrders);

        return new PlatformMetrics(
                acc.totalRevenue,
                acc.grossMerchandiseValue,
                acc.totalPlatformFee,
                totalOrders,
                acc.completedOrders,
                acc.processingOrders,
                acc.cancelledOrders,
                averageOrderValue
        );
    }

    private record ShopOrderAmounts(BigDecimal revenue, BigDecimal pendingRevenue) {}

    private ShopOrderAmounts calculateShopOrderAmounts(List<Order> shopOrders) {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal pending = BigDecimal.ZERO;
        for (Order o : shopOrders) {
            BigDecimal a = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
            if (o.getStatus() != OrderStatus.CANCELLED && o.getStatus() != OrderStatus.RETURNED && o.getPaymentStatus() != PaymentStatus.REFUNDED) {
                if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                    revenue = revenue.add(a);
                } else {
                    pending = pending.add(a);
                }
            }
        }
        return new ShopOrderAmounts(revenue, pending);
    }

    private ShopRevenueSummary buildSingleShopRevenueSummary(Shop shop, List<Order> shopOrders) {
        ShopOrderAmounts amounts = calculateShopOrderAmounts(shopOrders);
        User owner = shop.getOwnerId() != null ? userRepository.findById(shop.getOwnerId()).orElse(null) : null;
        return ShopRevenueSummary.builder()
                .shopId(shop.getId())
                .shopName(shop.getName())
                .ownerName(resolveOwnerDisplayName(owner))
                .ownerEmail(owner != null ? owner.getEmail() : shop.getEmail())
                .shopPhone(shop.getPhone())
                .shopStatus(shop.getStatus() != null ? shop.getStatus().name() : "ACTIVE")
                .totalOrders(shopOrders.size())
                .totalRevenue(amounts.revenue())
                .pendingRevenue(amounts.pendingRevenue())
                .bankName(shop.getBankName())
                .bankBin(shop.getBankBin())
                .bankAccountNumber(shop.getBankAccountNumber())
                .bankAccountName(shop.getBankAccountName())
                .build();
    }

    private List<ShopRevenueSummary> buildShopRevenueSummaries(List<Shop> allShops, Map<Long, List<Order>> ordersByShop) {
        List<ShopRevenueSummary> shopRevenues = new ArrayList<>();
        for (Shop shop : allShops) {
            List<Order> shopOrders = ordersByShop.getOrDefault(shop.getId(), Collections.emptyList());
            shopRevenues.add(buildSingleShopRevenueSummary(shop, shopOrders));
        }
        shopRevenues.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));
        return shopRevenues;
    }

    private String resolveOwnerDisplayName(User owner) {
        if (owner == null) {
            return "N/A";
        }
        if (owner.getFullName() != null && !owner.getFullName().isBlank()) {
            return owner.getFullName();
        }
        return owner.getUsername();
    }

    private List<DailyRevenueSummary> calculateDailyRevenues(List<Order> orders) {
        Map<LocalDate, BigDecimal> dailyMap = new TreeMap<>();
        Map<LocalDate, Long> dailyCountMap = new HashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            dailyMap.put(day, BigDecimal.ZERO);
            dailyCountMap.put(day, 0L);
        }

        for (Order o : orders) {
            if (o.getCreatedAt() != null && o.getStatus() != OrderStatus.CANCELLED && o.getStatus() != OrderStatus.RETURNED && o.getPaymentStatus() != PaymentStatus.REFUNDED) {
                LocalDate orderDate = o.getCreatedAt().toLocalDate();
                if (dailyMap.containsKey(orderDate)) {
                    BigDecimal a = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                    dailyMap.put(orderDate, dailyMap.get(orderDate).add(a));
                    dailyCountMap.put(orderDate, dailyCountMap.get(orderDate) + 1);
                }
            }
        }

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM");
        List<DailyRevenueSummary> dailyRevenues = new ArrayList<>();
        for (Map.Entry<LocalDate, BigDecimal> entry : dailyMap.entrySet()) {
            dailyRevenues.add(DailyRevenueSummary.builder()
                    .date(entry.getKey().format(dtf))
                    .revenue(entry.getValue())
                    .orderCount(dailyCountMap.getOrDefault(entry.getKey(), 0L))
                    .build());
        }
        return dailyRevenues;
    }

    private List<RecentOrderSummary> mapRecentOrders(List<Order> orders, Map<Long, Shop> shopMap) {
        return orders.stream()
                .limit(100)
                .map(o -> {
                    Shop s = o.getShopId() != null ? shopMap.get(o.getShopId()) : null;
                    return RecentOrderSummary.builder()
                            .orderId(o.getId())
                            .orderCode(o.getOrderCode())
                            .shopId(o.getShopId())
                            .shopName(s != null ? s.getName() : ("Shop #" + o.getShopId()))
                            .customerName(o.getRecipientName())
                            .totalAmount(o.getTotalAmount())
                            .orderStatus(o.getStatus() != null ? o.getStatus().name() : "PENDING")
                            .paymentStatus(o.getPaymentStatus() != null ? o.getPaymentStatus().name() : "UNPAID")
                            .createdAt(o.getCreatedAt())
                            .build();
                })
                .toList();
    }

    private void verifyAdminAccess(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        ROLE_ADMIN_STR.equalsIgnoreCase(r.getCode()) || ROLE_ROLE_ADMIN_STR.equalsIgnoreCase(r.getCode())));

        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống (Admin) mới có quyền truy cập báo cáo doanh thu");
        }
    }
}
