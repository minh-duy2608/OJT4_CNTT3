package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.request.CreateShopReviewRequest;
import com.example.demo.dto.request.ModerateShopReviewRequest;
import com.example.demo.dto.request.ReplyShopReviewRequest;
import com.example.demo.dto.request.UpdateShopReviewRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopReviewResponse;
import com.example.demo.dto.response.ShopReviewSummaryResponse;
import com.example.demo.entity.ShopReviewStatus;
import com.example.demo.service.ShopReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "16. Shop Review API - Đánh giá cửa hàng", description = "Đánh giá cửa hàng từ đơn hàng, phản hồi đánh giá và kiểm duyệt")
@RestController
@RequiredArgsConstructor
public class ShopReviewController {

    private final ShopReviewService shopReviewService;

    /**
     * STT 124: GET /shops/{shopId}/reviews - Danh sách đánh giá công khai của cửa hàng (Public)
     */
    @GetMapping({"/shops/{shopId}/reviews", "/api/v1/shops/{shopId}/reviews"})
    public ResponseEntity<ApiResponse<PageResponse<ShopReviewResponse>>> getPublicShopReviews(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<ShopReviewResponse> response = shopReviewService.getPublicShopReviews(shopId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá công khai thành công", response));
    }

    /**
     * STT 125: GET /shops/{shopId}/reviews/summary - Tổng hợp điểm đánh giá (Public)
     */
    @GetMapping({"/shops/{shopId}/reviews/summary", "/api/v1/shops/{shopId}/reviews/summary"})
    public ResponseEntity<ApiResponse<ShopReviewSummaryResponse>> getShopReviewSummary(@PathVariable Long shopId) {
        ShopReviewSummaryResponse response = shopReviewService.getShopReviewSummary(shopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng hợp điểm đánh giá thành công", response));
    }

    /**
     * STT 126: POST /orders/{orderId}/review - Tạo đánh giá cho cửa hàng từ đơn hàng (CLIENT)
     */
    @PostMapping({"/orders/{orderId}/review", "/api/v1/orders/{orderId}/review"})
    public ResponseEntity<ApiResponse<ShopReviewResponse>> createOrderReview(
            @PathVariable Long orderId,
            @Valid @RequestBody CreateShopReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.createOrderReview(orderId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đánh giá cửa hàng thành công", response));
    }

    /**
     * STT 127: GET /orders/{orderId}/review - Xem đánh giá của đơn hàng (Chủ đơn hàng)
     */
    @GetMapping({"/orders/{orderId}/review", "/api/v1/orders/{orderId}/review"})
    public ResponseEntity<ApiResponse<ShopReviewResponse>> getOrderReview(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.getOrderReview(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đánh giá đơn hàng thành công", response));
    }

    /**
     * STT 128: PATCH /reviews/{reviewId} - Sửa đánh giá theo chính sách (Chủ đánh giá)
     */
    @PatchMapping({"/reviews/{reviewId}", "/api/v1/reviews/{reviewId}"})
    public ResponseEntity<ApiResponse<ShopReviewResponse>> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateShopReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.updateReview(reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đánh giá thành công", response));
    }

    /**
     * STT 129: DELETE /reviews/{reviewId} - Xóa đánh giá (Chủ đánh giá)
     */
    @DeleteMapping({"/reviews/{reviewId}", "/api/v1/reviews/{reviewId}"})
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long reviewId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        shopReviewService.deleteReview(reviewId, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa đánh giá thành công", null));
    }

    /**
     * STT 130: POST /shops/{shopId}/reviews/{reviewId}/reply - Cửa hàng phản hồi đánh giá (Shop permission)
     */
    @PostMapping({"/shops/{shopId}/reviews/{reviewId}/reply", "/api/v1/shops/{shopId}/reviews/{reviewId}/reply"})
    public ResponseEntity<ApiResponse<ShopReviewResponse>> replyReview(
            @PathVariable Long shopId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReplyShopReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.replyReview(shopId, reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi đánh giá thành công", response));
    }

    /**
     * STT 131: PATCH /shops/{shopId}/reviews/{reviewId}/reply - Cập nhật phản hồi (Shop permission)
     */
    @PatchMapping({"/shops/{shopId}/reviews/{reviewId}/reply", "/api/v1/shops/{shopId}/reviews/{reviewId}/reply"})
    public ResponseEntity<ApiResponse<ShopReviewResponse>> updateReply(
            @PathVariable Long shopId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReplyShopReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.updateReply(shopId, reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phản hồi thành công", response));
    }

    /**
     * STT 132: GET /shops/{shopId}/reviews/manage - Danh sách đánh giá trong phạm vi quản lý (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/reviews/manage", "/api/v1/shops/{shopId}/reviews/manage"})
    public ResponseEntity<ApiResponse<PageResponse<ShopReviewResponse>>> getShopManageReviews(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ShopReviewResponse> response = shopReviewService.getShopManageReviews(shopId, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá của cửa hàng thành công", response));
    }

    /**
     * STT 133: GET /admin/reviews - Danh sách đánh giá phục vụ quản trị (ADMIN)
     */
    @GetMapping({"/admin/reviews", "/api/v1/admin/reviews"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ShopReviewResponse>>> getAdminReviews(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) ShopReviewStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ShopReviewResponse> response = shopReviewService.getAdminReviews(shopId, status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá quản trị thành công", response));
    }

    /**
     * STT 134: PATCH /admin/reviews/{reviewId}/moderation - Xử lý đánh giá vi phạm (ADMIN)
     */
    @PatchMapping({"/admin/reviews/{reviewId}/moderation", "/api/v1/admin/reviews/{reviewId}/moderation"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<ShopReviewResponse>> moderateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ModerateShopReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopReviewResponse response = shopReviewService.moderateReview(reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt đánh giá thành công", response));
    }
}

