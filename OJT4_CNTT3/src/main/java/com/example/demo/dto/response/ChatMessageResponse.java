package com.example.demo.dto.response;

import com.example.demo.entity.ChatMessageType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO trả về khi client nhận tin nhắn qua WebSocket hoặc REST.
 */
@Data
@Builder
public class ChatMessageResponse {

    private Long id;
    private String clientMsgId;
    private Long roomId;

    private Long senderId;
    private String senderName;
    private String senderAvatar;

    private Long receiverId;

    private String content;
    private ChatMessageType messageType;

    // ---- Thông tin sản phẩm đính kèm ----
    private Long productId;
    private String productName;
    private String productImage;
    private BigDecimal productPrice;

    private Boolean isRead;
    private LocalDateTime createdAt;
}

