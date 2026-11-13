package com.example.demo.dto.request;

import com.example.demo.entity.ChatMessageType;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận từ client qua WebSocket khi gửi tin nhắn.
 */
@Data
public class ChatSendRequest {

    /** ID duy nhất từ client để chống trùng lặp và đồng bộ Optimistic UI */
    private String clientMsgId;

    /** ID người gửi */
    private Long senderId;

    /** ID người nhận */
    private Long receiverId;

    /** Nội dung tin nhắn (null nếu messageType = PRODUCT_CARD) */
    private String content;

    /** Loại tin nhắn: TEXT | PRODUCT_CARD (mặc định TEXT) */
    private ChatMessageType messageType = ChatMessageType.TEXT;

    // ---- Chỉ điền khi messageType = PRODUCT_CARD ----
    private Long productId;
    private String productName;
    private String productImage;
    private BigDecimal productPrice;
}

