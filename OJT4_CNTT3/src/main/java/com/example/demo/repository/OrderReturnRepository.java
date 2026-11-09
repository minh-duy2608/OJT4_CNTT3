package com.example.demo.repository;

import com.example.demo.entity.OrderReturn;
import com.example.demo.entity.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderReturnRepository extends JpaRepository<OrderReturn, Long> {

    List<OrderReturn> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Page<OrderReturn> findByRequestedByOrderByCreatedAtDesc(Long requestedBy, Pageable pageable);

    @Query("SELECT r FROM OrderReturn r JOIN r.order o WHERE o.shopId = :shopId AND (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    Page<OrderReturn> findByShopIdAndStatus(@Param("shopId") Long shopId, @Param("status") ReturnStatus status, Pageable pageable);

    @Query("SELECT r FROM OrderReturn r WHERE (:status IS NULL OR r.status = :status) ORDER BY r.createdAt DESC")
    Page<OrderReturn> findAllByStatus(@Param("status") ReturnStatus status, Pageable pageable);

    boolean existsByOrderIdAndStatusNotIn(Long orderId, List<ReturnStatus> excludedStatuses);
}

