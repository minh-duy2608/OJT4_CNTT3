package com.example.demo.repository;

import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Shop> findByStatus(ShopStatus status);

    Optional<Shop> findFirstByOwnerIdOrderByIdDesc(Long ownerId);

    List<Shop> findByOwnerId(Long ownerId);

    @Query("SELECT s FROM Shop s WHERE (:status IS NULL OR s.status = :status) " +
           "AND (:keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Shop> searchShops(@Param("keyword") String keyword, @Param("status") ShopStatus status, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM shop_members WHERE shop_id = :shopId AND user_id = :userId AND status = 'ACTIVE'", nativeQuery = true)
    long countActiveMemberInShop(@Param("shopId") Long shopId, @Param("userId") Long userId);

    @Modifying
    @Query(value = "INSERT INTO shop_members (shop_id, user_id, role_id, status, joined_at) VALUES (:shopId, :userId, :roleId, 'ACTIVE', NOW()) ON DUPLICATE KEY UPDATE status = 'ACTIVE'", nativeQuery = true)
    void addShopMember(@Param("shopId") Long shopId, @Param("userId") Long userId, @Param("roleId") Long roleId);
}

