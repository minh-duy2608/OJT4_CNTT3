package com.example.demo.repository;

import com.example.demo.entity.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByCode(String code);

    Optional<RoleEntity> findByCodeIgnoreCase(String code);

    List<RoleEntity> findByCodeIn(Collection<String> codes);

    boolean existsByCode(String code);
}
