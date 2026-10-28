package com.example.demo.dto.response;

import com.example.demo.entity.Address;
import com.fasterxml.jackson.annotation.JsonFormat;
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
public class AddressResponse {

    private Long id;
    private String recipientName;
    private String fullName; // Alias for recipientName to seamlessly support FE
    private String phone;
    private String province;
    private String city; // Alias for province to seamlessly support FE
    private String district;
    private String ward;
    private String addressDetail;
    private String detailAddress; // Alias for addressDetail to seamlessly support FE
    private String deliveryNote;
    private String type; // e.g. "home" or "office"
    private boolean isDefault;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public static AddressResponse fromEntity(Address address) {
        if (address == null) return null;
        return AddressResponse.builder()
                .id(address.getId())
                .recipientName(address.getRecipientName())
                .fullName(address.getRecipientName())
                .phone(address.getPhone())
                .province(address.getProvince())
                .city(address.getProvince())
                .district(address.getDistrict())
                .ward(address.getWard())
                .addressDetail(address.getAddressDetail())
                .detailAddress(address.getAddressDetail())
                .deliveryNote(address.getDeliveryNote())
                .type(address.getDeliveryNote() != null && address.getDeliveryNote().equalsIgnoreCase("office") ? "office" : "home")
                .isDefault(address.isDefault())
                .createdAt(address.getCreatedAt())
                .updatedAt(address.getUpdatedAt())
                .build();
    }
}

