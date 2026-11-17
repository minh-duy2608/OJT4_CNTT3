package com.example.demo.dto.payment;

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
public class ShopPayoutItemResponse {
    private Long orderId;
    private String orderCode;
    private Long shopId;
    private String shopName;
    private BigDecimal totalAmount;
    private BigDecimal shippingFee;
    private BigDecimal productAmount;
    private BigDecimal platformFee;
    private BigDecimal shopPayoutAmount;
    private String settlementCycle;
    private String settlementDeadline;
    private String shopPayoutStatus; // HOLDING, READY_FOR_PAYOUT, PAID_OUT
    private LocalDateTime shopPayoutAt;
    private String shopPayoutNote;
    private LocalDateTime deliveredAt;
    private Boolean buyerConfirmedDelivery;
    private String shopBankName;
    private String shopBankBin;
    private String shopBankAccountNumber;
    private String shopBankAccountName;
    private String vietQrUrl;
    private String recipientName;
    private LocalDateTime createdAt;
}

