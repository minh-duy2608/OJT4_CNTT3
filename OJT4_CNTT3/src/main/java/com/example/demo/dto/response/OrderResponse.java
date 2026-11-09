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
public class OrderResponse {

    private Long id;
    private String orderCode;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private Long shopId;
    private String shopName;
    private Long addressId;

    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;

    private OrderStatus status;
    private PaymentStatus paymentStatus;
    private String paymentMethod;
    private String note;

    private LocalDateTime confirmedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<OrderItemResponse> items;

    // Chi tiết timeline hành trình đơn hàng
    private List<OrderTrackingResponse.TrackingTimelineEvent> timeline;

    // Quyền thao tác của khách hàng
    private Boolean buyerConfirmedDelivery;
    private Boolean canConfirmDelivery;
    private Boolean canCancel;
    private Boolean canReturn;
    private Boolean canReview;
    private String reviewConditionMessage;

    // Yêu cầu đổi trả / hoàn tiền (nếu có) & Hướng dẫn hoàn hàng
    private ReturnResponse returnRequest;
    private String returnInstructions;
}

