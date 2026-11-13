package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "chat_rooms",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_chat_room_buyer_seller",
        columnNames = {"buyer_id", "seller_id"}
    ),
    indexes = {
        @Index(name = "idx_chat_room_buyer",   columnList = "buyer_id"),
        @Index(name = "idx_chat_room_seller",  columnList = "seller_id"),
        @Index(name = "idx_chat_room_last_msg", columnList = "last_message_time DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID của người mua (Customer) */
    @Column(name = "buyer_id", nullable = false)
    private Long buyerId;

    /** ID của người bán (Shop owner / Seller) */
    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    /** Nội dung tin nhắn cuối cùng (truncate 500 ký tự) */
    @Column(name = "last_message", length = 500)
    private String lastMessage;

    /** Thời gian tin nhắn cuối cùng */
    @Column(name = "last_message_time")
    private LocalDateTime lastMessageTime;

    /** Số tin chưa đọc phía người mua */
    @Column(name = "buyer_unread_count", nullable = false)
    @Builder.Default
    private Integer buyerUnreadCount = 0;

    /** Số tin chưa đọc phía người bán */
    @Column(name = "seller_unread_count", nullable = false)
    @Builder.Default
    private Integer sellerUnreadCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.buyerUnreadCount == null) this.buyerUnreadCount = 0;
        if (this.sellerUnreadCount == null) this.sellerUnreadCount = 0;
    }
}

