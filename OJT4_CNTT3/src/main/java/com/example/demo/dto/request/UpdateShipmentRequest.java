package com.example.demo.dto.request;

import com.example.demo.entity.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShipmentRequest {
    private String carrier;
    private String trackingCode;
    private ShipmentStatus status;
    private String note;
}
