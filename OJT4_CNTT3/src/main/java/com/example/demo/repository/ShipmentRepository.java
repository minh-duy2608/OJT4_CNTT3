package com.example.demo.repository;

import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    List<Shipment> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<Shipment> findFirstByOrderIdOrderByCreatedAtDesc(Long orderId);

    @Query("SELECT s FROM Shipment s JOIN s.order o WHERE o.shopId = :shopId AND (:status IS NULL OR s.status = :status) ORDER BY s.createdAt DESC")
    Page<Shipment> findByShopIdAndStatus(@Param("shopId") Long shopId, @Param("status") ShipmentStatus status, Pageable pageable);

    @Query("SELECT s FROM Shipment s WHERE (:status IS NULL OR s.status = :status) ORDER BY s.createdAt DESC")
    Page<Shipment> findAllByStatus(@Param("status") ShipmentStatus status, Pageable pageable);

    Optional<Shipment> findByTrackingCode(String trackingCode);
}

