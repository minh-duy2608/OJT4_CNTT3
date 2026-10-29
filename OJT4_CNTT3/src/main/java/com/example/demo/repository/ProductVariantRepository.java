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

    List<ProductVariant> findByProductIdAndStatus(Long productId, ProductVariantStatus status);

    Optional<ProductVariant> findBySku(String sku);

    boolean existsBySku(String sku);
}

