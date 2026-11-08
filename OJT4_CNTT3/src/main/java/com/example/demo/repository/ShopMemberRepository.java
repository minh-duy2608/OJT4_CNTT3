package com.example.demo.repository;

import com.example.demo.entity.ShopMember;
import com.example.demo.entity.ShopMemberId;
import com.example.demo.entity.ShopMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopMemberRepository extends JpaRepository<ShopMember, ShopMemberId> {

    List<ShopMember> findByIdShopId(Long shopId);

    List<ShopMember> findByIdUserId(Long userId);

    List<ShopMember> findByIdUserIdAndStatus(Long userId, ShopMemberStatus status);

    Optional<ShopMember> findByIdShopIdAndIdUserId(Long shopId, Long userId);

    boolean existsByIdShopIdAndIdUserId(Long shopId, Long userId);

    boolean existsByIdShopIdAndIdUserIdAndStatus(Long shopId, Long userId, ShopMemberStatus status);

    void deleteByIdShopIdAndIdUserId(Long shopId, Long userId);

    long countByIdShopIdAndStatus(Long shopId, ShopMemberStatus status);
}

