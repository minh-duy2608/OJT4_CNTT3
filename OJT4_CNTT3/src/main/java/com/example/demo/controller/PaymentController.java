package com.example.demo.controller;

import com.example.demo.dto.payment.PayOSPaymentResponse;
import com.example.demo.dto.payment.PayOSWebhookRequest;
import com.example.demo.dto.payment.ShopPayoutItemResponse;
import com.example.demo.dto.payment.ShopPayoutSummaryResponse;
import com.example.demo.dto.request.UpdateShopBankRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.ShopDetailResponse;
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
        boolean processed = payOSService.handleWebhook(request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", processed ? "Xử lý webhook PayOS thành công" : "PayOS webhook verified"
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

    /**
     * Admin: Lấy danh sách đối soát & chuyển tiền cho Shop (Escrow Payouts)
     */
    @Operation(summary = "Admin: Lấy danh sách quyết toán tiền cho Shop", description = "Quản trị viên đối soát danh sách đơn hàng đã nhận tiền, các đơn khách đã nhận hàng thành công cần chuyển tiền cho Shop")
    @GetMapping({"/payment/payouts", "/api/v1/payment/payouts"})
    public ResponseEntity<ApiResponse<ShopPayoutSummaryResponse>> getPayoutSummary(
            @RequestParam(required = false) String status,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopPayoutSummaryResponse response = payOSService.getPayoutSummary(status, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối soát chuyển tiền thành công", response));
    }

    /**
     * Shop: Lấy danh sách đối soát tiền của Shop mình
     */
    @Operation(summary = "Shop: Danh sách đối soát tiền của Shop", description = "Xem lịch sử tiền sàn đang giữ và tiền đã được Admin quyết toán về tài khoản")
    @GetMapping({"/payment/payouts/shop/{shopId}", "/api/v1/payment/payouts/shop/{shopId}"})
    public ResponseEntity<ApiResponse<ShopPayoutSummaryResponse>> getShopPayouts(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopPayoutSummaryResponse response = payOSService.getShopPayouts(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đối soát của Shop thành công", response));
    }

    /**
     * Admin: Xác nhận đã chuyển tiền cho Shop thành công
     */
    @Operation(summary = "Admin: Xác nhận đã chuyển tiền cho Shop", description = "Cập nhật trạng thái đối soát sang PAID_OUT sau khi Admin đã chuyển khoản ngân hàng cho Shop")
    @PostMapping({"/payment/payouts/{orderId}/confirm", "/api/v1/payment/payouts/{orderId}/confirm"})
    public ResponseEntity<ApiResponse<ShopPayoutItemResponse>> confirmShopPayout(
            @PathVariable Long orderId,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        String note = body != null ? body.get("note") : null;
        String txRef = body != null ? body.get("transactionRef") : null;
        ShopPayoutItemResponse response = payOSService.confirmShopPayout(orderId, note, txRef, username);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận đã chuyển tiền cho Shop thành công!", response));
    }

    /**
     * Shop: Cập nhật thông tin tài khoản ngân hàng nhận tiền
     */
    @Operation(summary = "Shop: Cập nhật tài khoản ngân hàng nhận tiền", description = "Chủ shop đăng ký/thay đổi số tài khoản ngân hàng để nhận tiền quyết toán từ Admin")
    @PutMapping({"/shops/{shopId}/bank-account", "/api/v1/shops/{shopId}/bank-account"})
    public ResponseEntity<ApiResponse<ShopDetailResponse>> updateShopBankAccount(
            @PathVariable Long shopId,
            @RequestBody UpdateShopBankRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = payOSService.updateShopBankAccount(shopId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tài khoản ngân hàng nhận tiền thành công", response));
    }
}

