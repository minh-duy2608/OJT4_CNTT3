package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportResponse {
    private String fromDate;
    private String toDate;
    private BigDecimal totalRevenue;
    private Long totalOrders;
    private List<TimePointRevenue> dataPoints;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimePointRevenue {
        private String date; // YYYY-MM-DD or YYYY-MM
        private BigDecimal revenue;
        private Long orderCount;
    }
}

