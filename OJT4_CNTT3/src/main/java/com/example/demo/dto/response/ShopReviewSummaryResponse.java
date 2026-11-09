package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopReviewSummaryResponse {
    private Long shopId;
    private String shopName;
    private Double averageRating;
    private Long totalReviews;
    private Map<Integer, Long> ratingCounts; // 5: count, 4: count, etc.
}
