package com.example.demo.repository;

import com.example.demo.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /**
     * Tìm phòng chat theo cặp buyer-seller (theo thứ tự cố định).
     * buyerId luôn là người mua, sellerId luôn là người bán.
     */
    Optional<ChatRoom> findByBuyerIdAndSellerId(Long buyerId, Long sellerId);

    /**
     * Lấy danh sách phòng chat của user (với vai trò buyer hoặc seller),
     * sắp xếp theo thời gian tin nhắn cuối giảm dần.
     */
    @Query("""
        SELECT r FROM ChatRoom r
        WHERE r.buyerId = :userId OR r.sellerId = :userId
        ORDER BY r.lastMessageTime DESC NULLS LAST
        """)
    List<ChatRoom> findAllByUserId(@Param("userId") Long userId);

    /**
     * Kiểm tra phòng chat tồn tại theo cặp (bất kể thứ tự vai trò,
     * dùng khi không biết ai là buyer/seller).
     */
    @Query("""
        SELECT r FROM ChatRoom r
        WHERE (r.buyerId = :userId1 AND r.sellerId = :userId2)
           OR (r.buyerId = :userId2 AND r.sellerId = :userId1)
        """)
    Optional<ChatRoom> findByParticipants(@Param("userId1") Long userId1,
                                          @Param("userId2") Long userId2);
}

