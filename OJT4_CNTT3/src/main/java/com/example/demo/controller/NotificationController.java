package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "18. Notification API - Thông báo người dùng", description = "Xem danh sách thông báo, đánh dấu đã đọc và quản lý thông báo")
@RestController
@RequestMapping({"/notifications", "/api/v1/notifications"})
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * STT 142: GET /notifications - Danh sách thông báo của người dùng hiện tại
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Authentication authentication
    ) {
        PageResponse<NotificationResponse> response = notificationService.getUserNotifications(authentication.getName(), page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thông báo thành công", response));
    }

    /**
     * STT 143: GET /notifications/{notificationId} - Chi tiết thông báo
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotificationDetail(
            @PathVariable Long id,
            Authentication authentication
    ) {
        NotificationResponse response = notificationService.getNotificationDetail(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thông báo thành công", response));
    }

    /**
     * STT 144: PATCH /notifications/{notificationId}/read - Đánh dấu đã đọc
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @PathVariable Long id,
            Authentication authentication
    ) {
        NotificationResponse response = notificationService.markAsRead(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu thông báo là đã đọc", response));
    }

    /**
     * STT 145: PATCH /notifications/read-all - Đánh dấu toàn bộ thông báo đã đọc
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Integer>> markAllAsRead(Authentication authentication) {
        int count = notificationService.markAllAsRead(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu " + count + " thông báo là đã đọc", count));
    }

    /**
     * STT 146: DELETE /notifications/{notificationId} - Xóa thông báo khỏi danh sách
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable Long id,
            Authentication authentication
    ) {
        notificationService.deleteNotification(id, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Xóa thông báo thành công", null));
    }
}
