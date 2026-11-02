package com.example.demo.dto.response;

import com.example.demo.entity.CouponDiscountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateCouponResponse {

    private boolean valid;
    private String message;
    private Long couponId;
    private String code;
    private String name;
    private CouponDiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal discountAmount;
    private BigDecimal eligibleSubtotal;
    private BigDecimal orderSubtotal;
    private BigDecimal finalTotal;
}
