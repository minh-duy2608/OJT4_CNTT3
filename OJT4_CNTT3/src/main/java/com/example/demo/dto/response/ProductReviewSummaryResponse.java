package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReviewSummaryResponse {

    @Builder.Default
    private Double averageRating = 0.0;

    @Builder.Default
    private Long totalReviews = 0L;

    @Builder.Default
    private Map<Integer, Long> ratingCounts = new HashMap<>();

    @Builder.Default
    private List<ProductReviewResponse> reviews = List.of();

    private Integer currentPage;
    private Integer totalPages;
    private Long totalElements;

    // Trạng thái của người dùng hiện tại đối với sản phẩm này
    private Boolean hasPurchased;
    private Boolean canReview;
    private Boolean isShopOwnerOfProduct;
    private String sellerShopName;
}
