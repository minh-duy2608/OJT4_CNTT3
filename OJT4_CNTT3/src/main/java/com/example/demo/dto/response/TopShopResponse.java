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
public class TopShopResponse {
    private Long shopId;
    private String shopName;
    private String logoUrl;
    private Long totalOrders;
    private Long totalDeliveredOrders;
    private BigDecimal totalRevenue;
}

