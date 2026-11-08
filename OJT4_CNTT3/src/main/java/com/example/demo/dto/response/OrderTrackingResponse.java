package com.example.demo.dto.response;

import com.example.demo.entity.OrderStatus;
import com.example.demo.entity.PaymentStatus;
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
public class OrderTrackingResponse {
    private Long orderId;
    private String orderCode;
    private OrderStatus status;
    private String statusDescription;
    private PaymentStatus paymentStatus;
    private String paymentMethod;
    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;
    private BigDecimal totalAmount;
    private Long shopId;
    private String shopName;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private List<TrackingTimelineEvent> timeline;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrackingTimelineEvent {
        private String step;
        private String title;
        private String description;
        private LocalDateTime timestamp;
        private boolean completed;
        private boolean current;
    }
}
