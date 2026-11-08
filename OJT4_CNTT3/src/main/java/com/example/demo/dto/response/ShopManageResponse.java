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
public class ShopManageResponse {
    private ShopDetailResponse shop;
    private long totalProducts;
    private long activeProducts;
    private long totalOrders;
    private long pendingOrders;
    private long completedOrders;
    private BigDecimal totalRevenue;
    private long totalMembers;
    private long lowStockCount;
    private String currentUserRoleInShop;
}
