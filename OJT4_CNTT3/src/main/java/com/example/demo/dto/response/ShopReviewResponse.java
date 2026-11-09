package com.example.demo.dto.response;

import com.example.demo.entity.ShopReviewStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopReviewResponse {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long shopId;
    private String shopName;
    private Long userId;
    private String username;
    private String userFullName;
    private String userAvatarUrl;
    private Integer rating;
    private String comment;
    private ShopReviewStatus status;
    private String shopReply;
    private LocalDateTime repliedAt;
    private Long moderatedBy;
    private LocalDateTime moderatedAt;
    private String moderationReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

