package com.example.demo.repository;

import com.example.demo.entity.WishlistItem;
import com.example.demo.entity.WishlistItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, WishlistItemId> {

    List<WishlistItem> findByIdWishlistIdOrderByCreatedAtDesc(Long wishlistId);

    long countByIdWishlistId(Long wishlistId);

    boolean existsByIdWishlistIdAndIdProductId(Long wishlistId, Long productId);

    @Modifying
    @Query("DELETE FROM WishlistItem wi WHERE wi.id.wishlistId = :wishlistId AND wi.id.productId = :productId")
    void deleteByWishlistIdAndProductId(@Param("wishlistId") Long wishlistId, @Param("productId") Long productId);

    @Modifying
    @Query("DELETE FROM WishlistItem wi WHERE wi.id.wishlistId = :wishlistId")
    void deleteByWishlistId(@Param("wishlistId") Long wishlistId);
}

