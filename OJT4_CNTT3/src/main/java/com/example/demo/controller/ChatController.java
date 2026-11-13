package com.example.demo.controller;

import com.example.demo.dto.request.ChatReadRequest;
import com.example.demo.dto.request.ChatSendRequest;
import com.example.demo.dto.response.ChatMessageResponse;
import com.example.demo.dto.response.ChatReadEventResponse;
import com.example.demo.dto.response.ChatRoomResponse;
import com.example.demo.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller tổng hợp xử lý Chat:
 * - WebSocket STOMP endpoints: /app/chat.send, /app/chat.read
 * - REST HTTP endpoints:       /api/chat/**
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Chat", description = "API Chat thời gian thực giữa Người mua và Người bán")
public class ChatController {

    private final ChatService             chatService;
    private final SimpMessagingTemplate   messagingTemplate;

    // =========================================================================
    // WebSocket STOMP Endpoints
    // =========================================================================

    /**
     * Client gửi tin nhắn đến: /app/chat.send
     * <p>
     * Sau khi lưu, server bắn tin tới:
     * <ul>
     *   <li>/topic/messages.{receiverId}  — người nhận</li>
     *   <li>/topic/messages.{senderId}    — người gửi (để UI đồng bộ chính mình)</li>
     * </ul>
     */
    @MessageMapping("/chat.send")
    public void sendMessage(ChatSendRequest request) {
        log.debug("WS /chat.send  sender={} receiver={}", request.getSenderId(), request.getReceiverId());
        try {
            ChatMessageResponse response = chatService.sendMessage(request);

            // Bắn tới kênh của người nhận
            messagingTemplate.convertAndSend(
                    "/topic/messages." + request.getReceiverId(),
                    response
            );
            // Bắn tới kênh của người gửi (để UI bên gửi cũng hiển thị ngay)
            messagingTemplate.convertAndSend(
                    "/topic/messages." + request.getSenderId(),
                    response
            );
        } catch (Exception e) {
            log.error("Lỗi khi gửi tin nhắn WS: {}", e.getMessage(), e);
        }
    }

    /**
     * Client đánh dấu đã đọc: /app/chat.read
     * <p>
     * Sau khi reset unread, server bắn sự kiện tới:
     * <ul>
     *   <li>/topic/read.{partnerId}  — đối phương nhận được thông báo "đã xem"</li>
     * </ul>
     */
    @MessageMapping("/chat.read")
    public void markAsRead(ChatReadRequest request) {
        log.debug("WS /chat.read  roomId={} readerId={}", request.getRoomId(), request.getReaderId());
        try {
            ChatReadEventResponse event = chatService.markAsRead(request);

            // Bắn event tới đối phương để cập nhật trạng thái "Đã xem"
            messagingTemplate.convertAndSend(
                    "/topic/read." + event.getPartnerId(),
                    event
            );
        } catch (Exception e) {
            log.error("Lỗi khi đánh dấu đã đọc WS: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // REST API Endpoints
    // =========================================================================

    /**
     * GET /api/chat/rooms/{userId}
     * Trả về danh sách cuộc hội thoại của user sắp xếp theo tin nhắn mới nhất.
     */
    @GetMapping("/api/chat/rooms/{userId}")
    @Operation(summary = "Lấy danh sách phòng chat của user")
    public ResponseEntity<List<ChatRoomResponse>> getRooms(@PathVariable Long userId) {
        return ResponseEntity.ok(chatService.getRoomsForUser(userId));
    }

    /**
     * GET /api/chat/history/{userId1}/{userId2}
     * Trả về toàn bộ lịch sử tin nhắn giữa 2 người. Tự động tạo phòng nếu chưa có.
     */
    @GetMapping("/api/chat/history/{userId1}/{userId2}")
    @Operation(summary = "Lấy lịch sử tin nhắn giữa 2 người dùng")
    public ResponseEntity<List<ChatMessageResponse>> getHistory(
            @PathVariable Long userId1,
            @PathVariable Long userId2) {
        return ResponseEntity.ok(chatService.getHistory(userId1, userId2));
    }

    /**
     * GET /api/chat/unread-count/{userId}
     * Trả về tổng số tin nhắn chưa đọc (badge Navbar).
     */
    @GetMapping("/api/chat/unread-count/{userId}")
    @Operation(summary = "Đếm tổng tin nhắn chưa đọc của user")
    public ResponseEntity<Map<String, Long>> countUnread(@PathVariable Long userId) {
        long count = chatService.countUnread(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }
}

