package com.example.demo.service;

import com.example.demo.dto.request.ChatReadRequest;
import com.example.demo.dto.request.ChatSendRequest;
import com.example.demo.dto.response.ChatMessageResponse;
import com.example.demo.dto.response.ChatReadEventResponse;
import com.example.demo.dto.response.ChatRoomResponse;

import java.util.List;

public interface ChatService {

    /**
     * Xử lý gửi tin nhắn:
     * - Tìm hoặc tạo mới ChatRoom giữa sender & receiver
     * - Lưu ChatMessage xuống DB
     * - Cập nhật lastMessage, lastMessageTime, unreadCount của người nhận
     * - Trả về ChatMessageResponse để broadcast
     */
    ChatMessageResponse sendMessage(ChatSendRequest request);

    /**
     * Xử lý đánh dấu đã đọc:
     * - Đánh dấu các tin nhắn chưa đọc trong phòng là đã đọc
     * - Reset unreadCount của reader về 0
     * - Trả về event để bắn tới đối phương
     */
    ChatReadEventResponse markAsRead(ChatReadRequest request);

    /**
     * Lấy danh sách phòng chat của user (kèm thông tin đối phương).
     */
    List<ChatRoomResponse> getRoomsForUser(Long userId);

    /**
     * Lấy toàn bộ lịch sử tin nhắn giữa 2 người dùng.
     * Nếu chưa có phòng chat, tự động tạo mới.
     */
    List<ChatMessageResponse> getHistory(Long userId1, Long userId2);

    /**
     * Đếm tổng số tin nhắn chưa đọc của user (dùng cho badge Navbar).
     */
    long countUnread(Long userId);
}

