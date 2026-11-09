package com.example.demo.repository;

import com.example.demo.entity.ShopReview;
import com.example.demo.entity.ShopReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShopReviewRepository extends JpaRepository<ShopReview, Long> {

    Optional<ShopReview> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    Page<ShopReview> findByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, ShopReviewStatus status, Pageable pageable);

    Page<ShopReview> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    @Query("SELECT r FROM ShopReview r WHERE (:shopId IS NULL OR r.shopId = :shopId) AND (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    Page<ShopReview> findAllByFilter(@Param("shopId") Long shopId, @Param("status") ShopReviewStatus status, Pageable pageable);

    @Query("SELECT COUNT(r) FROM ShopReview r WHERE r.shopId = :shopId AND r.status = 'PUBLISHED'")
    long countPublishedByShopId(@Param("shopId") Long shopId);

    @Query("SELECT AVG(r.rating) FROM ShopReview r WHERE r.shopId = :shopId AND r.status = 'PUBLISHED'")
    Double getAverageRatingByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(r) FROM ShopReview r WHERE r.shopId = :shopId AND r.rating = :rating AND r.status = 'PUBLISHED'")
    long countByShopIdAndRating(@Param("shopId") Long shopId, @Param("rating") int rating);
}

