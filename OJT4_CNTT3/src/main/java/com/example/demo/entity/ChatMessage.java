package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "chat_messages",
    indexes = {
        @Index(name = "idx_chat_msg_room",    columnList = "room_id"),
        @Index(name = "idx_chat_msg_sender",  columnList = "sender_id"),
        @Index(name = "idx_chat_msg_created", columnList = "created_at"),
        @Index(name = "idx_chat_msg_unread",  columnList = "receiver_id, is_read")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Phòng chat chứa tin nhắn này */
    @Column(name = "room_id", nullable = false)
    private Long roomId;

    /** ID người gửi */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    /** ID người nhận */
    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    /** Nội dung tin nhắn */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** Loại tin nhắn: TEXT | PRODUCT_CARD */
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    @Builder.Default
    private ChatMessageType messageType = ChatMessageType.TEXT;

    // ---- Thông tin sản phẩm đính kèm (nullable, chỉ dùng khi messageType = PRODUCT_CARD) ----

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", length = 300)
    private String productName;

    @Column(name = "product_image", length = 500)
    private String productImage;

    @Column(name = "product_price", precision = 15, scale = 2)
    private BigDecimal productPrice;

    // -----------------------------------------------------------------------

    /** Trạng thái đã đọc (false = chưa đọc) */
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isRead == null) this.isRead = false;
        if (this.messageType == null) this.messageType = ChatMessageType.TEXT;
    }
}

