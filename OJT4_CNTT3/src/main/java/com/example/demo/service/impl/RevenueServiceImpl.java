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

        // Filter by shop if requested
        List<Order> filteredOrders = allOrders;
        if (targetShopId != null) {
            filteredOrders = allOrders.stream()
                    .filter(o -> targetShopId.equals(o.getShopId()))
                    .collect(Collectors.toList());
        }

        // Calculate platform totals
        BigDecimal totalRevenue = BigDecimal.ZERO; // Completed or paid orders
        BigDecimal grossMerchandiseValue = BigDecimal.ZERO; // Total GMV (all non-cancelled)
        long totalOrders = filteredOrders.size();
        long completedOrders = 0;
        long processingOrders = 0;
        long cancelledOrders = 0;

        for (Order order : filteredOrders) {
            BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
            OrderStatus status = order.getStatus();
            PaymentStatus paymentStatus = order.getPaymentStatus();

            if (status == OrderStatus.CANCELLED) {
                cancelledOrders++;
            } else {
                grossMerchandiseValue = grossMerchandiseValue.add(amount);

                if (status == OrderStatus.DELIVERED || paymentStatus == PaymentStatus.PAID) {
                    totalRevenue = totalRevenue.add(amount);
                }

                if (status == OrderStatus.DELIVERED) {
                    completedOrders++;
                } else {
                    processingOrders++;
                }
            }
        }

        BigDecimal averageOrderValue = BigDecimal.ZERO;
        if (totalOrders > 0) {
            averageOrderValue = grossMerchandiseValue.divide(BigDecimal.valueOf(totalOrders), 0, RoundingMode.HALF_UP);
        }

        // Breakdown by shop
        Map<Long, List<Order>> ordersByShop = allOrders.stream()
                .filter(o -> o.getShopId() != null)
                .collect(Collectors.groupingBy(Order::getShopId));

        List<ShopRevenueSummary> shopRevenues = new ArrayList<>();
        for (Shop shop : allShops) {
            List<Order> shopOrders = ordersByShop.getOrDefault(shop.getId(), Collections.emptyList());
            BigDecimal sRev = BigDecimal.ZERO;
            BigDecimal sPending = BigDecimal.ZERO;
            long sOrderCount = shopOrders.size();

            for (Order o : shopOrders) {
                BigDecimal a = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                if (o.getStatus() != OrderStatus.CANCELLED) {
                    if (o.getStatus() == OrderStatus.DELIVERED || o.getPaymentStatus() == PaymentStatus.PAID) {
                        sRev = sRev.add(a);
                    } else {
                        sPending = sPending.add(a);
                    }
                }
            }

            User owner = shop.getOwnerId() != null ? userRepository.findById(shop.getOwnerId()).orElse(null) : null;

            shopRevenues.add(ShopRevenueSummary.builder()
                    .shopId(shop.getId())
                    .shopName(shop.getName())
                    .ownerName(owner != null ? (owner.getFullName() != null && !owner.getFullName().isBlank() ? owner.getFullName() : owner.getUsername()) : "N/A")
                    .ownerEmail(owner != null ? owner.getEmail() : shop.getEmail())
                    .shopPhone(shop.getPhone())
                    .shopStatus(shop.getStatus() != null ? shop.getStatus().name() : "ACTIVE")
                    .totalOrders(sOrderCount)
                    .totalRevenue(sRev)
                    .pendingRevenue(sPending)
                    .build());
        }

        // Sort shopRevenues by totalRevenue descending
        shopRevenues.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));

        // Daily revenue for last 7 days
        Map<LocalDate, BigDecimal> dailyMap = new TreeMap<>();
        Map<LocalDate, Long> dailyCountMap = new HashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            dailyMap.put(day, BigDecimal.ZERO);
            dailyCountMap.put(day, 0L);
        }

        for (Order o : filteredOrders) {
            if (o.getCreatedAt() != null && o.getStatus() != OrderStatus.CANCELLED) {
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

        // Recent 10 orders
        List<RecentOrderSummary> recentOrders = filteredOrders.stream()
                .limit(10)
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
                .collect(Collectors.toList());

        return AdminRevenueResponse.builder()
                .totalRevenue(totalRevenue)
                .grossMerchandiseValue(grossMerchandiseValue)
                .totalOrders(totalOrders)
                .completedOrders(completedOrders)
                .processingOrders(processingOrders)
                .cancelledOrders(cancelledOrders)
                .averageOrderValue(averageOrderValue)
                .shopRevenues(shopRevenues)
                .dailyRevenues(dailyRevenues)
                .recentOrders(recentOrders)
                .build();
    }

    private void verifyAdminAccess(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống (Admin) mới có quyền truy cập báo cáo doanh thu");
        }
    }
}
