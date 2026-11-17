package com.example.demo.service;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.dto.response.PageResponse;

import java.util.List;

public interface NotificationService {

    List<NotificationResponse> getNotificationsByUserId(Long userId);

    long getUnreadCountByUserId(Long userId);

    NotificationResponse markAsReadById(Long notificationId);

    int markAllAsReadByUserId(Long userId);

    PageResponse<NotificationResponse> getUserNotifications(String currentUsername, int page, int size);

    NotificationResponse getNotificationDetail(Long notificationId, String currentUsername);

    NotificationResponse markAsRead(Long notificationId, String currentUsername);

    int markAllAsRead(String currentUsername);

    void deleteNotification(Long notificationId, String currentUsername);

    void createNotification(Long userId, String type, String title, String message, String referenceType, Long referenceId);
}

