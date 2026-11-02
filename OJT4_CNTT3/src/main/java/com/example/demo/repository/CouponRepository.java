package com.example.demo.repository;

import com.example.demo.entity.Coupon;
import com.example.demo.entity.CouponStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCode(String code);

    Optional<Coupon> findByShopIdAndCode(Long shopId, String code);

    @Query("SELECT c FROM Coupon c WHERE c.shopId = :shopId AND c.status = 'ACTIVE' " +
           "AND c.startAt <= :now AND c.endAt >= :now " +
           "AND (c.usageLimit IS NULL OR c.usageCount < c.usageLimit) " +
           "ORDER BY c.discountValue DESC")
    List<Coupon> findActivePublicCouponsByShopId(@Param("shopId") Long shopId, @Param("now") LocalDateTime now);
}

