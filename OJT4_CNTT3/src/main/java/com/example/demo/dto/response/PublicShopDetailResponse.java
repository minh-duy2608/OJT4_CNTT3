package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicShopDetailResponse {

    private ShopDetailResponse shop;
    private PageResponse<ProductSummaryResponse> products;
    private List<ShopFilterOption> availableCategories;
    private List<ShopFilterOption> availableBrands;
    private Long totalActiveProducts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShopFilterOption {
        private Long id;
        private String name;
        private String slug;
        private Long productCount;
    }
}
