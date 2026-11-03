package com.example.demo.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    private Long addressId;

    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;

    private Long shopId;

    @NotEmpty(message = "Đơn hàng phải có ít nhất một sản phẩm")
    @Valid
    private List<CreateOrderItemRequest> items;

    private String voucherCode;
    private BigDecimal discountAmount;
    private BigDecimal shippingFee;
    private BigDecimal subtotal;
    private BigDecimal totalAmount;

    private String paymentMethod;
    private String notes;
}

