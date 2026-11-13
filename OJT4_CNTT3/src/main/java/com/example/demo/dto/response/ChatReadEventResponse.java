package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * DTO bắn qua WebSocket khi sự kiện "đã đọc" xảy ra,
 * để đối phương cập nhật trạng thái tin nhắn trên UI.
 */
@Data
@Builder
public class ChatReadEventResponse {

    private Long roomId;

    /** ID người vừa đọc */
    private Long readerId;

    /** ID đối phương (người sẽ nhận sự kiện này) */
    private Long partnerId;

    /** Số unread còn lại của người đọc sau khi reset */
    private Integer remainingUnread;
}

