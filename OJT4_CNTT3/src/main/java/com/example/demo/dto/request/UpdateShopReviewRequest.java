package com.example.demo.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShopReviewRequest {

    @Min(value = 1, message = "Điểm đánh giá thấp nhất là 1 sao")
    @Max(value = 5, message = "Điểm đánh giá cao nhất là 5 sao")
    private Integer rating;

    private String comment;

    private java.util.List<String> imageUrls;
}

