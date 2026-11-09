package com.example.demo.service;

import com.example.demo.dto.request.CreateShopReviewRequest;
import com.example.demo.dto.request.ModerateShopReviewRequest;
import com.example.demo.dto.request.ReplyShopReviewRequest;
import com.example.demo.dto.request.UpdateShopReviewRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopReviewResponse;
import com.example.demo.dto.response.ShopReviewSummaryResponse;
import com.example.demo.entity.ShopReviewStatus;

public interface ShopReviewService {

    PageResponse<ShopReviewResponse> getPublicShopReviews(Long shopId, int page, int size);

    ShopReviewSummaryResponse getShopReviewSummary(Long shopId);

    ShopReviewResponse createOrderReview(Long orderId, CreateShopReviewRequest request, String currentUsername);

    ShopReviewResponse getOrderReview(Long orderId, String currentUsername);

    ShopReviewResponse updateReview(Long reviewId, UpdateShopReviewRequest request, String currentUsername);

    void deleteReview(Long reviewId, String currentUsername);

    ShopReviewResponse replyReview(Long shopId, Long reviewId, ReplyShopReviewRequest request, String currentUsername);

    ShopReviewResponse updateReply(Long shopId, Long reviewId, ReplyShopReviewRequest request, String currentUsername);

    PageResponse<ShopReviewResponse> getShopManageReviews(Long shopId, int page, int size, String currentUsername);

    PageResponse<ShopReviewResponse> getAdminReviews(Long shopId, ShopReviewStatus status, int page, int size, String currentUsername);

    ShopReviewResponse moderateReview(Long reviewId, ModerateShopReviewRequest request, String currentUsername);
}

