package com.example.demo.repository;

import com.example.demo.entity.Inventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByVariantId(Long variantId);

    List<Inventory> findByVariantIdIn(Collection<Long> variantIds);

    @Query("SELECT i FROM Inventory i " +
           "JOIN ProductVariant pv ON i.variantId = pv.id " +
           "JOIN pv.product p " +
           "WHERE p.shopId = :shopId AND p.deletedAt IS NULL " +
           "AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(pv.variantName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(pv.sku) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Inventory> findByShopIdAndKeyword(@Param("shopId") Long shopId, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT i FROM Inventory i " +
           "JOIN ProductVariant pv ON i.variantId = pv.id " +
           "JOIN pv.product p " +
           "WHERE p.shopId = :shopId AND p.deletedAt IS NULL " +
           "AND (i.quantity - i.reservedQuantity) <= :threshold " +
           "ORDER BY (i.quantity - i.reservedQuantity) ASC")
    List<Inventory> findLowStockByShopId(@Param("shopId") Long shopId, @Param("threshold") int threshold);
}

