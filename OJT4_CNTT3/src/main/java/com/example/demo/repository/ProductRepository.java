package com.example.demo.repository;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByCategoryIdAndStatusAndDeletedAtIsNull(Long categoryId, ProductStatus status, Pageable pageable);

    long countByCategoryId(Long categoryId);
}
