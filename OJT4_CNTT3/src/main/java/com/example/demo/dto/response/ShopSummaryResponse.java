package com.example.demo.dto.response;

import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopSummaryResponse {

    private Long id;
    private String name;
    private String slug;
    private String logoUrl;
    private ShopStatus status;

    public static ShopSummaryResponse fromEntity(Shop shop) {
        if (shop == null) return null;
        return ShopSummaryResponse.builder()
                .id(shop.getId())
                .name(shop.getName())
                .slug(shop.getSlug())
                .logoUrl(shop.getLogoUrl())
                .status(shop.getStatus())
                .build();
    }
}
