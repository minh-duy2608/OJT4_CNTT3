package com.example.demo.controller;

import com.example.demo.dto.payment.PayOSPaymentResponse;
import com.example.demo.dto.payment.PayOSWebhookRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.service.PayOSService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Tag(name = "17. Thanh toán trực tuyến - PayOS & VietQR", description = "Tạo mã QR VietQR, kiểm tra trạng thái thanh toán tự động, Webhook PayOS")
@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PayOSService payOSService;

    /**
     * Tạo liên kết và mã QR VietQR thanh toán PayOS cho đơn hàng (thời gian giữ hàng 15 phút)
     */
    @Operation(summary = "Tạo mã QR thanh toán PayOS", description = "Tạo liên kết và chuỗi mã QR VietQR để người dùng quét thanh toán qua ứng dụng ngân hàng")
    @PostMapping({"/payment/payos/create-link/{orderId}", "/api/v1/payment/payos/create-link/{orderId}"})
    public ResponseEntity<ApiResponse<PayOSPaymentResponse>> createPaymentLink(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PayOSPaymentResponse response = payOSService.createPaymentLink(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Khởi tạo liên kết thanh toán PayOS thành công", response));
    }

    /**
     * Tra cứu trạng thái thanh toán đơn hàng (Client Polling)
     */
    @Operation(summary = "Kiểm tra trạng thái thanh toán PayOS", description = "Kiểm tra xem đơn hàng đã được chuyển khoản thành công hay chưa")
    @GetMapping({"/payment/payos/status/{orderId}", "/api/v1/payment/payos/status/{orderId}"})
    public ResponseEntity<ApiResponse<PayOSPaymentResponse>> getPaymentStatus(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PayOSPaymentResponse response = payOSService.getPaymentStatus(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy trạng thái thanh toán thành công", response));
    }

    /**
     * Webhook nhận thông báo chuyển khoản thành công từ cổng PayOS
     */
    @Operation(summary = "Webhook PayOS (Công khai)", description = "Cổng PayOS tự động gọi vào endpoint này khi khách chuyển tiền thật thành công vào tài khoản")
    @PostMapping({"/payment/payos/webhook", "/api/v1/payment/payos/webhook"})
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestBody PayOSWebhookRequest request
    ) {
        log.info("Incoming PayOS Webhook received: code={}", request != null ? request.getCode() : "null");
        boolean success = payOSService.handleWebhook(request);
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "Xử lý webhook PayOS thành công" : "Bỏ qua hoặc không tìm thấy đơn"
        ));
    }

    /**
     * Hủy liên kết thanh toán PayOS
     */
    @Operation(summary = "Hủy thanh toán PayOS", description = "Hủy mã QR thanh toán và giải phóng số lượng hàng đã tạm giữ")
    @PostMapping({"/payment/payos/cancel/{orderId}", "/api/v1/payment/payos/cancel/{orderId}"})
    public ResponseEntity<ApiResponse<PayOSPaymentResponse>> cancelPaymentLink(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PayOSPaymentResponse response = payOSService.cancelPaymentLink(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy thanh toán PayOS", response));
    }

    /**
     * Endpoint hỗ trợ Test Demo: Giả lập chuyển khoản thành công nhận tiền ngay
     */
    @Operation(summary = "Giả lập chuyển khoản thành công (Test Demo)", description = "Hỗ trợ kiểm thử hiệu ứng Animation nhận tiền thành công mà không cần chuyển tiền thật")
    @PostMapping({"/payment/payos/simulate-success/{orderId}", "/api/v1/payment/payos/simulate-success/{orderId}"})
    public ResponseEntity<ApiResponse<PayOSPaymentResponse>> simulateSuccess(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PayOSPaymentResponse response = payOSService.simulatePaymentSuccess(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Giả lập thanh toán thành công!", response));
    }
}
