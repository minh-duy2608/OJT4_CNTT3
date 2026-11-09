package com.example.demo.service.impl;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getUserNotifications(String currentUsername, int page, int size) {
        User user = getCurrentUser(currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<Notification> notificationPage = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

        return PageResponse.<NotificationResponse>builder()
                .content(notificationPage.getContent().stream().map(this::mapToResponse).toList())
                .page(notificationPage.getNumber())
                .size(notificationPage.getSize())
                .totalElements(notificationPage.getTotalElements())
                .totalPages(notificationPage.getTotalPages())
                .last(notificationPage.isLast())
                .first(notificationPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getNotificationDetail(Long notificationId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo #" + notificationId));
        return mapToResponse(notification);
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long notificationId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo #" + notificationId));

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }
        return mapToResponse(notification);
    }

    @Override
    @Transactional
    public int markAllAsRead(String currentUsername) {
        User user = getCurrentUser(currentUsername);
        return notificationRepository.markAllAsRead(user.getId());
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo #" + notificationId));
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public void createNotification(Long userId, String type, String title, String message, String referenceType, Long referenceId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        log.info("Created notification for user #{}: {}", userId, title);
    }

    private User getCurrentUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));
    }

    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .referenceType(n.getReferenceType())
                .referenceId(n.getReferenceId())
                .isRead(n.getIsRead())
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}

