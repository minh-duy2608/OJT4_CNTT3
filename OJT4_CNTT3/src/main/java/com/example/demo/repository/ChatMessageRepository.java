package com.example.demo.repository;

import com.example.demo.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Lấy toàn bộ lịch sử tin nhắn của 1 phòng, sắp xếp từ cũ đến mới.
     */
    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);

    /**
     * Đếm tổng số tin nhắn chưa đọc mà user là người nhận.
     */
    @Query("""
        SELECT COUNT(m) FROM ChatMessage m
        WHERE m.receiverId = :userId AND m.isRead = false
        """)
    long countUnreadByReceiverId(@Param("userId") Long userId);

    /**
     * Lấy các tin nhắn chưa đọc trong 1 phòng mà user là người nhận.
     */
    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.roomId = :roomId AND m.receiverId = :readerId AND m.isRead = false
        """)
    List<ChatMessage> findUnreadMessages(@Param("roomId") Long roomId,
                                         @Param("readerId") Long readerId);

    /**
     * Đánh dấu tất cả tin nhắn chưa đọc trong 1 phòng là đã đọc.
     */
    @Modifying
    @Query("""
        UPDATE ChatMessage m SET m.isRead = true
        WHERE m.roomId = :roomId AND m.receiverId = :readerId AND m.isRead = false
        """)
    int markMessagesAsRead(@Param("roomId") Long roomId,
                           @Param("readerId") Long readerId);
}

