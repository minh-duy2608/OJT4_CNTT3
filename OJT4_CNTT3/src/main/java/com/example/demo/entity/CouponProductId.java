package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Builder
public class CouponProductId implements Serializable {

    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Column(name = "product_id", nullable = false)
    private Long productId;
}

