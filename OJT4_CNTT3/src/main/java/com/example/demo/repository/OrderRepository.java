package com.example.demo.repository;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderCode(String orderCode);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Order> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, OrderStatus status, Pageable pageable);

    Page<Order> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    Page<Order> findByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, OrderStatus status, Pageable pageable);

    long countByUserId(Long userId);

    long countByShopId(Long shopId);

    long countByShopIdAndStatus(Long shopId, OrderStatus status);

    java.util.List<Order> findByShopId(Long shopId);

    @Query("SELECT o FROM Order o WHERE (:shopId IS NULL OR o.shopId = :shopId) AND (:status IS NULL OR o.status = :status)")
    Page<Order> findAllByFilter(@Param("shopId") Long shopId, @Param("status") OrderStatus status, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.status = :status AND (o.paymentStatus = com.example.demo.entity.PaymentStatus.UNPAID OR o.paymentStatus = com.example.demo.entity.PaymentStatus.PENDING) AND (o.paymentMethod IS NULL OR (UPPER(o.paymentMethod) NOT LIKE '%COD%' AND LOWER(o.paymentMethod) NOT LIKE '%tiền mặt%')) AND ((o.expiresAt IS NOT NULL AND o.expiresAt < :now) OR (o.expiresAt IS NULL AND o.createdAt < :fallbackTime))")
    java.util.List<Order> findExpiredPendingOrders(
            @Param("status") OrderStatus status,
            @Param("now") java.time.LocalDateTime now,
            @Param("fallbackTime") java.time.LocalDateTime fallbackTime
    );

    @Query("SELECT o FROM Order o WHERE o.status != com.example.demo.entity.OrderStatus.CANCELLED ORDER BY o.createdAt DESC")
    java.util.List<Order> findAllEscrowOrders();

    @Query("SELECT o FROM Order o WHERE o.shopId = :shopId AND o.status != com.example.demo.entity.OrderStatus.CANCELLED ORDER BY o.createdAt DESC")
    java.util.List<Order> findEscrowOrdersByShopId(@Param("shopId") Long shopId);
}

