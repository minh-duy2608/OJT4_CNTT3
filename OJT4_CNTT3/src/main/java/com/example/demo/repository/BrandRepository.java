package com.example.demo.repository;

import com.example.demo.entity.Brand;
import com.example.demo.entity.BrandStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByName(String name);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsByNameAndIdNot(String name, Long id);

    List<Brand> findAllByOrderByNameAsc();

    List<Brand> findByStatusOrderByNameAsc(BrandStatus status);
}
