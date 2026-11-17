package com.example.demo.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopPayoutSummaryResponse {
    @Builder.Default
    private BigDecimal totalHoldingAmount = BigDecimal.ZERO;
    @Builder.Default
    private Long totalHoldingCount = 0L;

    @Builder.Default
    private BigDecimal totalReadyAmount = BigDecimal.ZERO;
    @Builder.Default
    private Long totalReadyCount = 0L;

    @Builder.Default
    private BigDecimal totalPaidOutAmount = BigDecimal.ZERO;
    @Builder.Default
    private Long totalPaidOutCount = 0L;

    @Builder.Default
    private List<ShopPayoutItemResponse> items = new ArrayList<>();
}

