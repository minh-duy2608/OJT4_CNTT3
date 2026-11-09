package com.example.demo.dto.response;

import com.example.demo.entity.ReturnStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnResponse {
    private Long id;
    private Long orderId;
    private String orderCode;
    private Long shopId;
    private String shopName;
    private Long requestedBy;
    private String requesterName;
    private String reason;
    private String description;
    private ReturnStatus status;
    private BigDecimal refundAmount;
    private String evidenceUrls;
    private String returnMethod;
    private Long processedBy;
    private String processorName;
    private LocalDateTime processedAt;
    private String resolutionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

