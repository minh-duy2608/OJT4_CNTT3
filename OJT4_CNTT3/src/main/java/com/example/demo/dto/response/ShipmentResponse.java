package com.example.demo.dto.response;

import com.example.demo.entity.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentResponse {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long shopId;
    private String shopName;
    private String carrier;
    private String trackingCode;
    private ShipmentStatus status;
    private BigDecimal shippingFee;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

