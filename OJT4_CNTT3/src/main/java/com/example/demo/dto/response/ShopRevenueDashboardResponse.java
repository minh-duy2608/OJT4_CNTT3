package com.example.demo.dto.response;

import com.example.demo.entity.OrderStatus;
import com.example.demo.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopRevenueDashboardResponse {

    private Long shopId;
    private String shopName;
    private String shopSlug;

    // Khoảng thời gian lọc
    private String fromDate;
    private String toDate;
    private String groupBy; // "day" hoặc "month"

    // Thống kê doanh thu cốt lõi (Quy tắc doanh thu được thể hiện rõ ràng)
    private BigDecimal grossRevenue;       // Tổng doanh thu từ các đơn hợp lệ trước khi trừ hoàn (DELIVERED + RETURNED)
    private BigDecimal refundAmount;       // Tổng tiền hoàn trả cho khách (từ các đơn RETURNED)
    private BigDecimal netRevenue;          // Doanh thu thuần thực tế = grossRevenue - refundAmount
    private BigDecimal pendingRevenue;      // Doanh thu tạm tính (đơn đang xử lý / vận chuyển: PENDING, CONFIRMED, PROCESSING, SHIPPED)
    private BigDecimal cancelledRevenue;    // Tổng giá trị các đơn đã hủy (ghi nhận đối chiếu, doanh thu = 0đ)

    // Thống kê số lượng đơn hàng
    private Long totalOrders;               // Tổng số đơn trong kỳ
    private Long deliveredOrders;           // Số đơn Giao thành công (DELIVERED)
    private Long returnedOrders;            // Số đơn Trả hàng / Hoàn tiền (RETURNED)
    private Long cancelledOrders;           // Số đơn Đã hủy (CANCELLED)
    private Long pendingOrders;             // Số đơn Đang xử lý / vận chuyển

    // Tiêu chí nghiệm thu: Quy tắc doanh thu được ghi rõ
    private String revenueRule;

    // Biểu đồ doanh thu theo thời gian
    private List<RevenueDataPoint> chartData;

    // Tiêu chí nghiệm thu: Số liệu đối chiếu query / từng đơn hàng cụ thể
    private List<OrderReconciliationItem> orderReconciliations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueDataPoint {
        private String date;             // YYYY-MM-DD hoặc YYYY-MM
        private BigDecimal grossRevenue; // Doanh thu gộp
        private BigDecimal refundAmount; // Tiền hoàn trả
        private BigDecimal netRevenue;   // Doanh thu thực nhận
        private Long orderCount;         // Số đơn hoàn tất
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderReconciliationItem {
        private Long orderId;
        private String orderCode;
        private OrderStatus status;
        private PaymentStatus paymentStatus;
        private BigDecimal orderTotal;
        private BigDecimal refundAmount;
        private BigDecimal netAmount;    // Giá trị thực tính vào doanh thu
        private LocalDateTime orderTime;
        private LocalDateTime deliveredTime;
        private String note;             // Ghi chú lý do tính hoặc loại trừ
    }
}
