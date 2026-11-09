package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopDashboardSummaryResponse {
    private Long shopId;
    private String shopName;
    private BigDecimal totalRevenue;
    private BigDecimal totalGmv;
    private Long totalOrders;
    private Long deliveredOrders;
    private Long processingOrders;
    private Long cancelledOrders;
    private Long totalProducts;
    private Long activeProducts;
    private Long lowStockItems;
}
