package com.example.demo.service;

import com.example.demo.dto.request.CreateProductReviewRequest;
import com.example.demo.dto.request.ReplyProductReviewRequest;
import com.example.demo.dto.request.UpdateProductReviewRequest;
import com.example.demo.dto.response.ProductReviewResponse;
import com.example.demo.dto.response.ProductReviewSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface ProductReviewService {

    ProductReviewSummaryResponse getProductReviews(Long productId, Integer ratingFilter, Pageable pageable, String currentUsername);

    ProductReviewResponse getMyReview(Long productId, String currentUsername);

    ProductReviewResponse createReview(Long productId, CreateProductReviewRequest request, String currentUsername);

    ProductReviewResponse updateReview(Long productId, Long reviewId, UpdateProductReviewRequest request, String currentUsername);

    void deleteReview(Long productId, Long reviewId, String currentUsername);

    ProductReviewResponse replyToReview(Long productId, Long reviewId, ReplyProductReviewRequest request, String currentUsername);

    ProductReviewResponse deleteReply(Long productId, Long reviewId, String currentUsername);
}

