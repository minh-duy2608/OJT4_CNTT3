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
public class PayOSPaymentResponse {
    private Long orderId;
    private String orderCode;
    private Long payosOrderCode;
    private BigDecimal amount;
    private String description;
    private String accountNumber;
    private String accountName;
    private String bankName;
    private String bin;
    private String qrCode;
    private String checkoutUrl;
    private String status; // PENDING, PAID, CANCELLED, EXPIRED
    private LocalDateTime expiresAt;
    private Long remainingSeconds;
}
