package com.example.demo.repository;

import com.example.demo.entity.ProductVariant;
import com.example.demo.entity.ProductVariantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductId(Long productId);

    List<ProductVariant> findByProductIdOrderByPriceAsc(Long productId);

    List<ProductVariant> findByProductIdAndStatus(Long productId, ProductVariantStatus status);

    Optional<ProductVariant> findBySku(String sku);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    Optional<ProductVariant> findByIdAndProductId(Long id, Long productId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM order_items WHERE variant_id = :variantId", nativeQuery = true)
    long countOrderItemsByVariantId(@org.springframework.data.repository.query.Param("variantId") Long variantId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM cart_items WHERE variant_id = :variantId", nativeQuery = true)
    long countCartItemsByVariantId(@org.springframework.data.repository.query.Param("variantId") Long variantId);
}

