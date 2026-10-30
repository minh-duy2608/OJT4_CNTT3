package com.example.demo.repository;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Page<Product> findByCategoryIdAndStatusAndDeletedAtIsNull(Long categoryId, ProductStatus status, Pageable pageable);

    Page<Product> findByBrandIdAndStatusAndDeletedAtIsNull(Long brandId, ProductStatus status, Pageable pageable);

    Page<Product> findByShopIdAndStatusAndDeletedAtIsNull(Long shopId, ProductStatus status, Pageable pageable);

    Optional<Product> findByIdAndDeletedAtIsNull(Long id);

    Optional<Product> findByIdAndStatusAndDeletedAtIsNull(Long id, ProductStatus status);

    Optional<Product> findByIdAndShopIdAndDeletedAtIsNull(Long id, Long shopId);

    Optional<Product> findByIdAndShopId(Long id, Long shopId);

    long countByCategoryId(Long categoryId);

    long countByBrandId(Long brandId);

    long countByShopId(Long shopId);

    boolean existsByShopIdAndSlug(Long shopId, String slug);

    boolean existsBySlug(String slug);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM order_items oi JOIN product_variants pv ON oi.variant_id = pv.id WHERE pv.product_id = :productId", nativeQuery = true)
    long countOrderItemsByProductId(@org.springframework.data.repository.query.Param("productId") Long productId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM cart_items ci JOIN product_variants pv ON ci.variant_id = pv.id WHERE pv.product_id = :productId", nativeQuery = true)
    long countCartItemsByProductId(@org.springframework.data.repository.query.Param("productId") Long productId);
}
