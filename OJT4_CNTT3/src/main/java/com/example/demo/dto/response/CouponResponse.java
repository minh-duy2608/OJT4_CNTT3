package com.example.demo.dto.response;

import com.example.demo.entity.Coupon;
import com.example.demo.entity.CouponDiscountType;
import com.example.demo.entity.CouponStatus;
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
public class CouponResponse {

    private Long id;
    private Long shopId;
    private String shopName;
    private String code;
    private String name;
    private String description;
    private CouponDiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    private Integer usageLimit;
    private Integer usageCount;
    private Integer perUserLimit;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private CouponStatus status;
    private boolean applicableToAllProducts;

    public static CouponResponse fromEntity(Coupon c, String shopName, boolean allProducts) {
        if (c == null) return null;
        return CouponResponse.builder()
                .id(c.getId())
                .shopId(c.getShopId())
                .shopName(shopName)
                .code(c.getCode())
                .name(c.getName())
                .description(c.getDescription())
                .discountType(c.getDiscountType())
                .discountValue(c.getDiscountValue())
                .maxDiscountAmount(c.getMaxDiscountAmount())
                .minOrderAmount(c.getMinOrderAmount())
                .usageLimit(c.getUsageLimit())
                .usageCount(c.getUsageCount())
                .perUserLimit(c.getPerUserLimit())
                .startAt(c.getStartAt())
                .endAt(c.getEndAt())
                .status(c.getStatus())
                .applicableToAllProducts(allProducts)
                .build();
    }
}

