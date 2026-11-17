package com.example.demo.dto.response;

import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import com.example.demo.entity.User;
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
    private String ownerName;
    private String ownerEmail;
    private String ownerPhone;
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
    private String bankName;
    private String bankBin;
    private String bankAccountNumber;
    private String bankAccountName;
    private Boolean contractAgreed;
    private java.math.BigDecimal platformFeeRate;
    private Integer settlementDay;
    private ShopStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isOwner;
    private boolean isAdminManaged;

    public static ShopDetailResponse fromEntity(Shop shop, boolean isOwner, boolean isAdminManaged) {
        return fromEntity(shop, null, isOwner, isAdminManaged);
    }

    public static ShopDetailResponse fromEntity(Shop shop, User owner, boolean isOwner, boolean isAdminManaged) {
        if (shop == null) return null;
        String ownerName = owner != null ? (owner.getFullName() != null && !owner.getFullName().isBlank() ? owner.getFullName() : owner.getUsername()) : null;
        String ownerEmail = owner != null ? owner.getEmail() : null;
        String ownerPhone = owner != null ? owner.getPhone() : null;

        String shopEmail = shop.getEmail();
        if ((shopEmail == null || shopEmail.isBlank()) && ownerEmail != null) {
            shopEmail = ownerEmail;
        }

        String shopPhone = shop.getPhone();
        if ((shopPhone == null || shopPhone.isBlank()) && ownerPhone != null) {
            shopPhone = ownerPhone;
        }

        return ShopDetailResponse.builder()
                .id(shop.getId())
                .ownerId(shop.getOwnerId())
                .ownerName(ownerName)
                .ownerEmail(ownerEmail)
                .ownerPhone(ownerPhone)
                .name(shop.getName())
                .slug(shop.getSlug())
                .description(shop.getDescription())
                .logoUrl(shop.getLogoUrl())
                .bannerUrl(shop.getBannerUrl())
                .email(shopEmail)
                .phone(shopPhone)
                .province(shop.getProvince())
                .district(shop.getDistrict())
                .ward(shop.getWard())
                .addressDetail(shop.getAddressDetail())
                .bankName(shop.getBankName())
                .bankBin(shop.getBankBin())
                .bankAccountNumber(shop.getBankAccountNumber())
                .bankAccountName(shop.getBankAccountName())
                .contractAgreed(shop.getContractAgreed() != null ? shop.getContractAgreed() : true)
                .platformFeeRate(shop.getPlatformFeeRate() != null ? shop.getPlatformFeeRate() : new java.math.BigDecimal("0.025"))
                .settlementDay(shop.getSettlementDay() != null ? shop.getSettlementDay() : 19)
                .status(shop.getStatus())
                .createdAt(shop.getCreatedAt())
                .updatedAt(shop.getUpdatedAt())
                .isOwner(isOwner)
                .isAdminManaged(isAdminManaged)
                .build();
    }
}

