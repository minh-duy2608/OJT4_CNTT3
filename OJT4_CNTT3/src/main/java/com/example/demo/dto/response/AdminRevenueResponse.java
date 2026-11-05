package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRevenueResponse {

    private BigDecimal totalRevenue;
    private BigDecimal grossMerchandiseValue;
    private long totalOrders;
    private long completedOrders;
    private long processingOrders;
    private long cancelledOrders;
    private BigDecimal averageOrderValue;
    private List<ShopRevenueSummary> shopRevenues;
    private List<DailyRevenueSummary> dailyRevenues;
    private List<RecentOrderSummary> recentOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShopRevenueSummary {
        private Long shopId;
        private String shopName;
        private String ownerName;
        private String ownerEmail;
        private String shopPhone;
        private String shopStatus;
        private long totalOrders;
        private BigDecimal totalRevenue;
        private BigDecimal pendingRevenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenueSummary {
        private String date;
        private BigDecimal revenue;
        private long orderCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentOrderSummary {
        private Long orderId;
        private String orderCode;
        private Long shopId;
        private String shopName;
        private String customerName;
        private BigDecimal totalAmount;
        private String orderStatus;
        private String paymentStatus;
        private LocalDateTime createdAt;
    }
}
