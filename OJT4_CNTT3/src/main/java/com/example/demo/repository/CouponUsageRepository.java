package com.example.demo.repository;

import com.example.demo.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {

    @Query("SELECT COUNT(u) FROM CouponUsage u WHERE u.couponId = :couponId AND u.userId = :userId AND u.status = 'APPLIED'")
    long countAppliedUsagesByCouponAndUser(@Param("couponId") Long couponId, @Param("userId") Long userId);
}

