package com.example.demo.service;

import com.example.demo.dto.payment.PayOSPaymentResponse;
import com.example.demo.dto.payment.PayOSWebhookRequest;
import com.example.demo.dto.payment.ShopPayoutItemResponse;
import com.example.demo.dto.payment.ShopPayoutSummaryResponse;
import com.example.demo.dto.request.UpdateShopBankRequest;
import com.example.demo.dto.response.ShopDetailResponse;

public interface PayOSService {

    /**
     * Tạo liên kết và mã QR thanh toán PayOS cho đơn hàng
     */
    PayOSPaymentResponse createPaymentLink(Long orderId, String username);

    /**
     * Kiểm tra trạng thái thanh toán PayOS của đơn hàng
     */
    PayOSPaymentResponse getPaymentStatus(Long orderId, String username);

    /**
     * Xử lý webhook tự động từ hệ thống PayOS khi khách chuyển khoản thành công
     */
    boolean handleWebhook(PayOSWebhookRequest request);

    /**
     * Hủy liên kết thanh toán PayOS và giải phóng tồn kho đã giữ
     */
    PayOSPaymentResponse cancelPaymentLink(Long orderId, String username);

    /**
     * Giả lập thanh toán thành công (dành cho môi trường test/demo hoặc dev)
     */
    PayOSPaymentResponse simulatePaymentSuccess(Long orderId, String username);

    /**
     * Lấy danh sách và thống kê đối soát tiền chuyển cho Shop (Admin Escrow Payouts)
     */
    ShopPayoutSummaryResponse getPayoutSummary(String statusFilter, String username);

    /**
     * Lấy danh sách đối soát tiền của một Shop cụ thể
     */
    ShopPayoutSummaryResponse getShopPayouts(Long shopId, String username);

    /**
     * Admin xác nhận đã chuyển tiền về số tài khoản của Shop
     */
    ShopPayoutItemResponse confirmShopPayout(Long orderId, String note, String transactionRef, String username);

    /**
     * Cập nhật tài khoản ngân hàng nhận tiền của Shop
     */
    ShopDetailResponse updateShopBankAccount(Long shopId, UpdateShopBankRequest request, String username);
}

