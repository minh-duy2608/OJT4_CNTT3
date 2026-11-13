package com.example.demo.dto.request;

import lombok.Data;

/**
 * DTO nhận từ client qua WebSocket khi người dùng mở/đọc phòng chat.
 */
@Data
public class ChatReadRequest {

    /** ID phòng chat */
    private Long roomId;

    /** ID người đọc (người vừa mở cuộc hội thoại) */
    private Long readerId;
}

