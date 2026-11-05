package com.example.demo.controller;

import com.example.demo.dto.request.CreateProductReviewRequest;
import com.example.demo.dto.request.ReplyProductReviewRequest;
import com.example.demo.dto.request.UpdateProductReviewRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.ProductReviewResponse;
import com.example.demo.dto.response.ProductReviewSummaryResponse;
import com.example.demo.service.ProductReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Tag(name = "19. Đánh giá sản phẩm & Phản hồi người bán", description = "Quản lý đánh giá sao, nhận xét của người dùng và phản hồi của shop")
@RestController
@RequiredArgsConstructor
@RequestMapping({"/products", "/api/v1/products"})
public class ProductReviewController {

    private final ProductReviewService productReviewService;

    @Operation(summary = "Lấy danh sách đánh giá & thống kê sao của sản phẩm (PUBLIC)")
    @GetMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<ProductReviewSummaryResponse>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.max(1, size), sort);

        ProductReviewSummaryResponse response = productReviewService.getProductReviews(productId, rating, pageable, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá thành công", response));
    }

    @Operation(summary = "Lấy bài đánh giá của tôi cho sản phẩm này (AUTH)")
    @GetMapping("/{productId}/reviews/my-review")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> getMyReview(
            @PathVariable Long productId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductReviewResponse response = productReviewService.getMyReview(productId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy đánh giá của tôi thành công", response));
    }

    @Operation(summary = "Khách hàng viết đánh giá cho sản phẩm (Mỗi người mua chỉ được 1 bài) (AUTH)")
    @PostMapping("/{productId}/reviews")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> createReview(
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductReviewResponse response = productReviewService.createReview(productId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đăng đánh giá sản phẩm thành công", response));
    }

    @Operation(summary = "Khách hàng chỉnh sửa bài đánh giá của mình (AUTH)")
    @PutMapping("/{productId}/reviews/{reviewId}")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> updateReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateProductReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductReviewResponse response = productReviewService.updateReview(productId, reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đánh giá thành công", response));
    }

    @Operation(summary = "Khách hàng hoặc Quản trị viên xóa bài đánh giá (AUTH)")
    @DeleteMapping("/{productId}/reviews/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        productReviewService.deleteReview(productId, reviewId, username);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa đánh giá thành công", null));
    }

    @Operation(summary = "Người bán (Shop Owner) hoặc Admin phản hồi đánh giá khách hàng (AUTH)")
    @PostMapping("/{productId}/reviews/{reviewId}/reply")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> replyToReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReplyProductReviewRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductReviewResponse response = productReviewService.replyToReview(productId, reviewId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi đánh giá thành công", response));
    }

    @Operation(summary = "Người bán hoặc Admin xóa câu trả lời (AUTH)")
    @DeleteMapping("/{productId}/reviews/{reviewId}/reply")
    public ResponseEntity<ApiResponse<ProductReviewResponse>> deleteReply(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductReviewResponse response = productReviewService.deleteReply(productId, reviewId, username);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa câu trả lời", response));
    }
}
