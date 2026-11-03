package com.example.demo.repository;

import com.example.demo.entity.CouponProduct;
import com.example.demo.entity.CouponProductId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CouponProductRepository extends JpaRepository<CouponProduct, CouponProductId> {

    List<CouponProduct> findByIdCouponId(Long couponId);

    boolean existsByIdCouponIdAndIdProductId(Long couponId, Long productId);

    long countByIdCouponId(Long couponId);
}

