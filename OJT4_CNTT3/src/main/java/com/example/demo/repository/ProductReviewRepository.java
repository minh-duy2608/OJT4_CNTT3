package com.example.demo.repository;

import com.example.demo.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    Page<ProductReview> findByProductIdAndRating(Long productId, Integer rating, Pageable pageable);

    long countByProductId(Long productId);

    long countByProductIdAndRating(Long productId, Integer rating);

    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT r.rating, COUNT(r) FROM ProductReview r WHERE r.product.id = :productId GROUP BY r.rating")
    List<Object[]> countReviewsGroupByRating(@Param("productId") Long productId);

    // Kiểm tra xem khách hàng đã mua sản phẩm này trong đơn hàng thành công chưa
    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi " +
           "JOIN oi.order o " +
           "WHERE (o.userId = :userId OR o.user.id = :userId) " +
           "AND o.status IN (com.example.demo.entity.OrderStatus.DELIVERED, com.example.demo.entity.OrderStatus.CONFIRMED, com.example.demo.entity.OrderStatus.PROCESSING, com.example.demo.entity.OrderStatus.SHIPPED) " +
           "AND (oi.variant.product.id = :productId OR EXISTS (SELECT v FROM ProductVariant v WHERE v.id = oi.variantId AND v.product.id = :productId))")
    boolean hasUserPurchasedProduct(@Param("userId") Long userId, @Param("productId") Long productId);
}
