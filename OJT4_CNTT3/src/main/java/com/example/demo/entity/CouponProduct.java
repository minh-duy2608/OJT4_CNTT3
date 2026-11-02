package com.example.demo.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "coupon_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponProduct {

    @EmbeddedId
    private CouponProductId id;
}
