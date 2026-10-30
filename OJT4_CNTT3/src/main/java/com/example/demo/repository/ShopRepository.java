package com.example.demo.repository;

import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    Optional<Shop> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Shop> findByStatus(ShopStatus status);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM shop_members WHERE shop_id = :shopId AND user_id = :userId AND status = 'ACTIVE'", nativeQuery = true)
    long countActiveMemberInShop(@org.springframework.data.repository.query.Param("shopId") Long shopId, @org.springframework.data.repository.query.Param("userId") Long userId);
}

