package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO trả về danh sách phòng chat của một user.
 * Bao gồm thông tin đối phương để hiển thị avatar, tên, tin nhắn cuối.
 */
@Data
@Builder
public class ChatRoomResponse {

    private Long roomId;

    /** ID của đối phương (người kia trong cuộc hội thoại) */
    private Long partnerId;
    private String partnerName;
    private String partnerAvatar;
    private String partnerEmail;

    private String lastMessage;
    private LocalDateTime lastMessageTime;

    /** Số tin nhắn chưa đọc của user hiện tại */
    private Integer unreadCount;
}

