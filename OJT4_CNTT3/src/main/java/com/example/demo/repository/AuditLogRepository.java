package com.example.demo.repository;

import com.example.demo.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%'))) AND " +
           "(:entityType IS NULL OR LOWER(a.entityType) = LOWER(:entityType)) AND " +
           "(:shopId IS NULL OR a.shopId = :shopId) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> findAllByFilter(@Param("action") String action,
                                  @Param("entityType") String entityType,
                                  @Param("shopId") Long shopId,
                                  Pageable pageable);

    Page<AuditLog> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);
}
