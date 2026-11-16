package com.example.demo.service;

import com.example.demo.dto.payment.PayOSPaymentResponse;
import com.example.demo.dto.payment.PayOSWebhookRequest;

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
}
