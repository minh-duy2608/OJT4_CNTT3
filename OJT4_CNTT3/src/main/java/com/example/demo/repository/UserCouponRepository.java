package com.example.demo.repository;

import com.example.demo.entity.UserCoupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCouponRepository extends JpaRepository<UserCoupon, Long> {

    Optional<UserCoupon> findByUserIdAndCouponId(Long userId, Long couponId);

    boolean existsByUserIdAndCouponId(Long userId, Long couponId);

    List<UserCoupon> findByUserIdOrderBySavedAtDesc(Long userId);

    Page<UserCoupon> findByUserIdOrderBySavedAtDesc(Long userId, Pageable pageable);

    void deleteByUserIdAndCouponId(Long userId, Long couponId);
}

