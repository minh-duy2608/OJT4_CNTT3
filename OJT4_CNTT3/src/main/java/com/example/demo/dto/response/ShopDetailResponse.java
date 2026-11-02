package com.example.demo.dto.response;

import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopDetailResponse {

    private Long id;
    private Long ownerId;
    private String name;
    private String slug;
    private String description;
    private String logoUrl;
    private String bannerUrl;
    private String email;
    private String phone;
    private String province;
    private String district;
    private String ward;
    private String addressDetail;
    private ShopStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isOwner;
    private boolean isAdminManaged;

    public static ShopDetailResponse fromEntity(Shop shop, boolean isOwner, boolean isAdminManaged) {
        if (shop == null) return null;
        return ShopDetailResponse.builder()
                .id(shop.getId())
                .ownerId(shop.getOwnerId())
                .name(shop.getName())
                .slug(shop.getSlug())
                .description(shop.getDescription())
                .logoUrl(shop.getLogoUrl())
                .bannerUrl(shop.getBannerUrl())
                .email(shop.getEmail())
                .phone(shop.getPhone())
                .province(shop.getProvince())
                .district(shop.getDistrict())
                .ward(shop.getWard())
                .addressDetail(shop.getAddressDetail())
                .status(shop.getStatus())
                .createdAt(shop.getCreatedAt())
                .updatedAt(shop.getUpdatedAt())
                .isOwner(isOwner)
                .isAdminManaged(isAdminManaged)
                .build();
    }
}
