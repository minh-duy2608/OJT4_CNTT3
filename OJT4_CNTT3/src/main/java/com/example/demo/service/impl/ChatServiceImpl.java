package com.example.demo.service.impl;

import com.example.demo.dto.request.ChatReadRequest;
import com.example.demo.dto.request.ChatSendRequest;
import com.example.demo.dto.response.ChatMessageResponse;
import com.example.demo.dto.response.ChatReadEventResponse;
import com.example.demo.dto.response.ChatRoomResponse;
import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.ChatMessageType;
import com.example.demo.entity.ChatRoom;
import com.example.demo.entity.User;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.ChatRoomRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatRoomRepository    chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository        userRepository;

    // =========================================================================
    // WebSocket handlers
    // =========================================================================

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(ChatSendRequest req) {
        Long senderId   = req.getSenderId();
        Long receiverId = req.getReceiverId();

        // 1. Tìm hoặc tạo mới ChatRoom (sender luôn là buyer nếu chưa tồn tại)
        ChatRoom room = chatRoomRepository
                .findByParticipants(senderId, receiverId)
                .orElseGet(() -> {
                    ChatRoom newRoom = ChatRoom.builder()
                            .buyerId(senderId)
                            .sellerId(receiverId)
                            .buyerUnreadCount(0)
                            .sellerUnreadCount(0)
                            .build();
                    return chatRoomRepository.save(newRoom);
                });

        // 2. Lưu tin nhắn
        ChatMessage message = ChatMessage.builder()
                .roomId(room.getId())
                .senderId(senderId)
                .receiverId(receiverId)
                .content(req.getContent())
                .messageType(req.getMessageType() != null ? req.getMessageType() : ChatMessageType.TEXT)
                .productId(req.getProductId())
                .productName(req.getProductName())
                .productImage(req.getProductImage())
                .productPrice(req.getProductPrice())
                .isRead(false)
                .build();
        chatMessageRepository.save(message);

        // 3. Cập nhật lastMessage, lastMessageTime và tăng unreadCount của người nhận
        String preview = buildPreview(req);
        room.setLastMessage(preview);
        room.setLastMessageTime(LocalDateTime.now());

        // Tăng unread cho người nhận
        if (receiverId.equals(room.getBuyerId())) {
            room.setBuyerUnreadCount(room.getBuyerUnreadCount() + 1);
        } else {
            room.setSellerUnreadCount(room.getSellerUnreadCount() + 1);
        }
        chatRoomRepository.save(room);

        // 4. Lấy thông tin người gửi để đính vào response
        User sender = userRepository.findById(senderId).orElse(null);

        return toMessageResponse(message, sender);
    }

    @Override
    @Transactional
    public ChatReadEventResponse markAsRead(ChatReadRequest req) {
        Long roomId  = req.getRoomId();
        Long readerId = req.getReaderId();

        // 1. Đánh dấu tất cả tin chưa đọc → đã đọc
        chatMessageRepository.markMessagesAsRead(roomId, readerId);

        // 2. Reset unreadCount của reader trong ChatRoom
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Phòng chat không tồn tại: " + roomId));

        Long partnerId;
        if (readerId.equals(room.getBuyerId())) {
            room.setBuyerUnreadCount(0);
            partnerId = room.getSellerId();
        } else {
            room.setSellerUnreadCount(0);
            partnerId = room.getBuyerId();
        }
        chatRoomRepository.save(room);

        // 3. Trả về event để bắn tới đối phương
        return ChatReadEventResponse.builder()
                .roomId(roomId)
                .readerId(readerId)
                .partnerId(partnerId)
                .remainingUnread(0)
                .build();
    }

    // =========================================================================
    // REST API handlers
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getRoomsForUser(Long userId) {
        List<ChatRoom> rooms = chatRoomRepository.findAllByUserId(userId);

        // Thu thập tất cả ID đối phương để batch-load từ DB (1 query)
        Set<Long> partnerIds = rooms.stream()
                .map(r -> r.getBuyerId().equals(userId) ? r.getSellerId() : r.getBuyerId())
                .collect(Collectors.toSet());

        Map<Long, User> userMap = userRepository.findAllById(partnerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return rooms.stream()
                .map(room -> {
                    Long partnerId = room.getBuyerId().equals(userId)
                            ? room.getSellerId() : room.getBuyerId();
                    User partner = userMap.get(partnerId);
                    int unread = room.getBuyerId().equals(userId)
                            ? room.getBuyerUnreadCount() : room.getSellerUnreadCount();

                    return ChatRoomResponse.builder()
                            .roomId(room.getId())
                            .partnerId(partnerId)
                            .partnerName(partner != null ? partner.getFullName() : "Người dùng")
                            .partnerAvatar(partner != null ? partner.getAvatarUrl() : null)
                            .partnerEmail(partner != null ? partner.getEmail() : null)
                            .lastMessage(room.getLastMessage())
                            .lastMessageTime(room.getLastMessageTime())
                            .unreadCount(unread)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<ChatMessageResponse> getHistory(Long userId1, Long userId2) {
        // Tìm hoặc tạo phòng chat
        ChatRoom room = chatRoomRepository
                .findByParticipants(userId1, userId2)
                .orElseGet(() -> {
                    ChatRoom newRoom = ChatRoom.builder()
                            .buyerId(userId1)
                            .sellerId(userId2)
                            .buyerUnreadCount(0)
                            .sellerUnreadCount(0)
                            .build();
                    return chatRoomRepository.save(newRoom);
                });

        List<ChatMessage> messages = chatMessageRepository
                .findByRoomIdOrderByCreatedAtAsc(room.getId());

        // Batch-load thông tin người gửi
        Set<Long> senderIds = messages.stream()
                .map(ChatMessage::getSenderId)
                .collect(Collectors.toSet());
        Map<Long, User> userMap = userRepository.findAllById(senderIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return messages.stream()
                .map(msg -> toMessageResponse(msg, userMap.get(msg.getSenderId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return chatMessageRepository.countUnreadByReceiverId(userId);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private ChatMessageResponse toMessageResponse(ChatMessage msg, User sender) {
        return ChatMessageResponse.builder()
                .id(msg.getId())
                .roomId(msg.getRoomId())
                .senderId(msg.getSenderId())
                .senderName(sender != null ? sender.getFullName() : "Người dùng")
                .senderAvatar(sender != null ? sender.getAvatarUrl() : null)
                .receiverId(msg.getReceiverId())
                .content(msg.getContent())
                .messageType(msg.getMessageType())
                .productId(msg.getProductId())
                .productName(msg.getProductName())
                .productImage(msg.getProductImage())
                .productPrice(msg.getProductPrice())
                .isRead(msg.getIsRead())
                .createdAt(msg.getCreatedAt())
                .build();
    }

    /** Tạo preview text cho lastMessage (tối đa 500 ký tự). */
    private String buildPreview(ChatSendRequest req) {
        if (ChatMessageType.PRODUCT_CARD.equals(req.getMessageType())) {
            String name = req.getProductName() != null ? req.getProductName() : "sản phẩm";
            return "[Sản phẩm] " + name;
        }
        String content = req.getContent();
        if (content == null) return "";
        return content.length() > 497 ? content.substring(0, 497) + "..." : content;
    }
}

