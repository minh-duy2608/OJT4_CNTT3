package com.example.demo.repository;

import com.example.demo.entity.Category;
import com.example.demo.entity.CategoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    List<Category> findByStatusOrderBySortOrderAscNameAsc(CategoryStatus status);

    List<Category> findAllByOrderBySortOrderAscNameAsc();

    List<Category> findByParentIsNullAndStatusOrderBySortOrderAscNameAsc(CategoryStatus status);

    List<Category> findByParentIsNullOrderBySortOrderAscNameAsc();

    List<Category> findByParentIdAndStatusOrderBySortOrderAscNameAsc(Long parentId, CategoryStatus status);

    long countByParentId(Long parentId);
}
