package com.example.demo.dto.response;

import com.example.demo.entity.ProductReview;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReviewResponse {

    private Long id;
    private Long productId;
    private Long userId;
    private String userName;
    private String userAvatar;
    private Integer rating;
    private String title;
    private String content;
    private List<String> imageUrls;
    private Boolean isBuyer;

    private String sellerReply;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime sellerReplyAt;
    private String sellerReplierName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    private Boolean isMyReview;

    public static ProductReviewResponse fromEntity(ProductReview review, Long currentUserId) {
        if (review == null) return null;
        boolean isMine = currentUserId != null && review.getUser() != null && currentUserId.equals(review.getUser().getId());
        String displayName = review.getUser() != null 
                ? (review.getUser().getFullName() != null && !review.getUser().getFullName().isBlank() 
                    ? review.getUser().getFullName() 
                    : review.getUser().getUsername())
                : "Khách hàng";

        List<String> imageUrls = new ArrayList<>();
        if (review.getImageUrls() != null && !review.getImageUrls().isBlank()) {
            try {
                if (review.getImageUrls().trim().startsWith("[")) {
                    ObjectMapper mapper = new ObjectMapper();
                    imageUrls = mapper.readValue(review.getImageUrls(), new TypeReference<List<String>>() {});
                } else {
                    imageUrls = Arrays.stream(review.getImageUrls().split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                }
            } catch (Exception e) {
                imageUrls = List.of(review.getImageUrls());
            }
        }

        return ProductReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct() != null ? review.getProduct().getId() : null)
                .userId(review.getUser() != null ? review.getUser().getId() : null)
                .userName(displayName)
                .userAvatar(review.getUser() != null ? review.getUser().getAvatarUrl() : null)
                .rating(review.getRating())
                .title(review.getTitle())
                .content(review.getContent())
                .imageUrls(imageUrls)
                .isBuyer(review.getIsBuyer() != null ? review.getIsBuyer() : false)
                .sellerReply(review.getSellerReply())
                .sellerReplyAt(review.getSellerReplyAt())
                .sellerReplierName(review.getSellerReplierName())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .isMyReview(isMine)
                .build();
    }
}

