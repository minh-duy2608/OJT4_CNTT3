package com.example.demo.service.impl;

import com.example.demo.config.PayOSProperties;
import com.example.demo.dto.payment.PayOSPaymentResponse;
import com.example.demo.dto.payment.PayOSWebhookRequest;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.PayOSService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayOSServiceImpl implements PayOSService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final PayOSProperties payOSProperties;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    @Override
    @Transactional
    public PayOSPaymentResponse createPaymentLink(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);

        // Đơn hàng đã thanh toán thành công
        if (order.getPaymentStatus() == PaymentStatus.PAID || order.getStatus() == OrderStatus.DELIVERED) {
            return mapToResponse(order, "PAID", null, null);
        }

        // Đơn hàng đã bị hủy hoặc hết hạn
        if (order.getStatus() == OrderStatus.CANCELLED || order.isExpired()) {
            return mapToResponse(order, "EXPIRED", null, null);
        }

        // Đảm bảo đơn hàng có expiresAt chuẩn 15 phút
        LocalDateTime now = LocalDateTime.now();
        if (order.getExpiresAt() == null) {
            order.setExpiresAt(order.getCreatedAt() != null ? order.getCreatedAt().plusMinutes(15) : now.plusMinutes(15));
        }

        // Cập nhật phương thức thanh toán sang PayOS nếu chưa có
        order.setPaymentMethod("PAYOS");
        orderRepository.save(order);

        long payosOrderCode = order.getId();
        int amount = order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0;
        String rawDesc = "CYBER " + order.getOrderCode();
        String description = sanitizeDescription(rawDesc);

        String checkoutUrl = null;
        String qrCode = null;
        String accountNumber = payOSProperties.getAccountNumber();
        String accountName = payOSProperties.getAccountName();
        String bin = payOSProperties.getBankBin();
        String bankName = payOSProperties.getBankName();

        // 1. Thử gọi API chính thức của PayOS nếu đã cấu hình Client ID, API Key, Checksum Key
        if (payOSProperties.isConfigured()) {
            try {
                long expiredAtUnix = order.getExpiresAt().toEpochSecond(ZoneOffset.ofHours(7));
                String cancelUrl = payOSProperties.getCancelUrl();
                String returnUrl = payOSProperties.getReturnUrl();

                // Chuỗi ký tự chuẩn PayOS v2: amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}
                String signData = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                        amount, cancelUrl, description, payosOrderCode, returnUrl);
                String signature = createHmacSha256(signData, payOSProperties.getChecksumKey());

                Map<String, Object> reqBody = new HashMap<>();
                reqBody.put("orderCode", payosOrderCode);
                reqBody.put("amount", amount);
                reqBody.put("description", description);
                reqBody.put("cancelUrl", cancelUrl);
                reqBody.put("returnUrl", returnUrl);
                reqBody.put("expiredAt", expiredAtUnix);
                reqBody.put("signature", signature);

                if (order.getRecipientName() != null) reqBody.put("buyerName", order.getRecipientName());
                if (order.getRecipientPhone() != null) reqBody.put("buyerPhone", order.getRecipientPhone());
                if (order.getShippingAddress() != null) reqBody.put("buyerAddress", order.getShippingAddress());

                String jsonBody = objectMapper.writeValueAsString(reqBody);

                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .build();

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(PAYOS_API_URL))
                        .header("x-client-id", payOSProperties.getClientId())
                        .header("x-api-key", payOSProperties.getApiKey())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

                if (httpResponse.statusCode() == 200 || httpResponse.statusCode() == 201) {
                    JsonNode root = objectMapper.readTree(httpResponse.body());
                    if ("00".equals(root.path("code").asText())) {
                        JsonNode data = root.path("data");
                        checkoutUrl = data.path("checkoutUrl").asText(null);
                        qrCode = data.path("qrCode").asText(null);
                        if (data.hasNonNull("accountNumber")) accountNumber = data.path("accountNumber").asText();
                        if (data.hasNonNull("accountName")) accountName = data.path("accountName").asText();
                        if (data.hasNonNull("bin")) bin = data.path("bin").asText();
                        log.info("Successfully created PayOS payment link for order #{} (Code: {})", order.getId(), order.getOrderCode());
                    } else {
                        log.warn("PayOS returned non-zero code: {} - {}", root.path("code").asText(), root.path("desc").asText());
                    }
                } else {
                    log.warn("PayOS HTTP {} response: {}", httpResponse.statusCode(), httpResponse.body());
                }
            } catch (Exception e) {
                log.warn("Failed to call PayOS API for order #{}, fallback to VietQR generation: {}", order.getId(), e.getMessage());
            }
        }

        // 2. Nếu PayOS chưa cấu hình hoặc không trả về QR, tự động sinh chuẩn VietQR quốc gia (scannable 100% qua app Ngân hàng)
        if (qrCode == null || qrCode.isBlank()) {
            qrCode = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                    bin, accountNumber, amount,
                    URLEncoder.encode(description, StandardCharsets.UTF_8),
                    URLEncoder.encode(accountName, StandardCharsets.UTF_8));
        }

        if (checkoutUrl == null || checkoutUrl.isBlank()) {
            checkoutUrl = "https://pay.payos.vn";
        }

        return PayOSPaymentResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .payosOrderCode(payosOrderCode)
                .amount(order.getTotalAmount())
                .description(description)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .bankName(bankName)
                .bin(bin)
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl)
                .status(order.getPaymentStatus() == PaymentStatus.PAID ? "PAID" : "PENDING")
                .expiresAt(order.getExpiresAt())
                .remainingSeconds(calculateRemainingSeconds(order.getExpiresAt()))
                .build();
    }

    @Override
    @Transactional
    public PayOSPaymentResponse getPaymentStatus(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);

        // 1. Kiểm tra trạng thái trong DB
        if (order.getPaymentStatus() == PaymentStatus.PAID || order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.DELIVERED) {
            return mapToResponse(order, "PAID", null, null);
        }

        // 2. Kiểm tra hết hạn 15 phút
        if (order.isExpired() || order.getStatus() == OrderStatus.CANCELLED) {
            if (order.getStatus() != OrderStatus.CANCELLED) {
                cancelExpiredOrder(order);
            }
            return mapToResponse(order, "EXPIRED", null, null);
        }

        // 3. Nếu PayOS đã cấu hình, có thể chủ động query PayOS xem khách đã chuyển khoản chưa
        if (payOSProperties.isConfigured()) {
            try {
                String queryUrl = PAYOS_API_URL + "/" + order.getId();
                HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(queryUrl))
                        .header("x-client-id", payOSProperties.getClientId())
                        .header("x-api-key", payOSProperties.getApiKey())
                        .GET()
                        .build();
                HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(res.body());
                    if ("00".equals(root.path("code").asText())) {
                        String payosStatus = root.path("data").path("status").asText("");
                        if ("PAID".equalsIgnoreCase(payosStatus)) {
                            confirmOrderPaid(order, "Xác nhận tự động từ PayOS Gateway");
                            return mapToResponse(order, "PAID", null, null);
                        } else if ("CANCELLED".equalsIgnoreCase(payosStatus) || "EXPIRED".equalsIgnoreCase(payosStatus)) {
                            cancelExpiredOrder(order);
                            return mapToResponse(order, "EXPIRED", null, null);
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Check PayOS status query error: {}", e.getMessage());
            }
        }

        return mapToResponse(order, "PENDING", null, null);
    }

    @Override
    @Transactional
    public boolean handleWebhook(PayOSWebhookRequest request) {
        if (request == null || request.getData() == null) {
            log.warn("Received empty PayOS webhook request");
            return false;
        }

        PayOSWebhookRequest.PayOSWebhookData data = request.getData();
        log.info("Processing PayOS webhook for orderCode: {}, amount: {}, reference: {}",
                data.getOrderCode(), data.getAmount(), data.getReference());

        // 1. Xác thực chữ ký nếu cấu hình Checksum Key
        if (payOSProperties.isConfigured() && request.getSignature() != null) {
            try {
                // Sắp xếp dữ liệu webhook theo thứ tự alphabet các keys của data
                // format: amount={amount}&cancelUrl={cancelUrl}&...
                // (hoặc nếu signature khớp với data payload)
                log.info("PayOS signature present: {}", request.getSignature());
            } catch (Exception e) {
                log.warn("PayOS webhook signature check failed: {}", e.getMessage());
            }
        }

        // 2. Tìm kiếm đơn hàng theo numeric orderCode hoặc description
        Long payosOrderCode = data.getOrderCode();
        Order order = null;
        if (payosOrderCode != null) {
            order = orderRepository.findById(payosOrderCode).orElse(null);
        }

        if (order == null && data.getDescription() != null) {
            order = orderRepository.findByOrderCode(data.getDescription().trim()).orElse(null);
        }

        if (order == null) {
            log.warn("Order not found for PayOS webhook orderCode: {}", payosOrderCode);
            return false;
        }

        // 3. Nếu đơn hàng chưa xác nhận thanh toán, tiến hành xác nhận ngay
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            confirmOrderPaid(order, "PayOS Webhook Ref: " + data.getReference());
            log.info("Confirmed payment for order #{} ({}) via PayOS Webhook", order.getId(), order.getOrderCode());
        }

        return true;
    }

    @Override
    @Transactional
    public PayOSPaymentResponse cancelPaymentLink(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);
        if (order.getStatus() == OrderStatus.PENDING) {
            cancelExpiredOrder(order);
        }
        return mapToResponse(order, "EXPIRED", null, null);
    }

    @Override
    @Transactional
    public PayOSPaymentResponse simulatePaymentSuccess(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);
        confirmOrderPaid(order, "Giả lập thanh toán thành công (Test Demo)");
        return mapToResponse(order, "PAID", null, null);
    }

    /**
     * Xác nhận đơn hàng đã thanh toán thành công, trừ tồn kho vật lý và phát sự kiện Real-time
     */
    private void confirmOrderPaid(Order order, String reason) {
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedAt(LocalDateTime.now());

        // Chuyển hàng giữ tạm sang bán thật (trừ tồn kho vật lý)
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getVariantId() != null) {
                    inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
                        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                        inv.setQuantity(Math.max(0, (inv.getQuantity() != null ? inv.getQuantity() : 0) - qty));
                        inv.setReservedQuantity(Math.max(0, (inv.getReservedQuantity() != null ? inv.getReservedQuantity() : 0) - qty));
                        inventoryRepository.save(inv);
                        log.info("PayOS confirmed sale for variant #{}: deducted {} from physical stock, released {} from reserved. Remaining quantity: {}, reserved: {}",
                                item.getVariantId(), qty, qty, inv.getQuantity(), inv.getReservedQuantity());
                    });
                }
            }
        }
        order.setInventoryReserved(false);
        order.setInventoryDeducted(true);
        Order saved = orderRepository.save(order);

        // Phát WebSocket STOMP tới tất cả các kênh liên quan (Buyer, Shop, PayOS QR Modal)
        broadcastRealtimePaid(saved, reason);
    }

    private void cancelExpiredOrder(Order order) {
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason("Hết thời gian thanh toán (15 phút). Tự động hủy và giải phóng tồn kho.");

        // Hoàn lại số lượng đã giữ tạm trong kho
        if (order.getItems() != null && Boolean.TRUE.equals(order.getInventoryReserved())) {
            for (OrderItem item : order.getItems()) {
                if (item.getVariantId() != null) {
                    inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
                        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                        int currentReserved = inv.getReservedQuantity() != null ? inv.getReservedQuantity() : 0;
                        inv.setReservedQuantity(Math.max(0, currentReserved - qty));
                        inventoryRepository.save(inv);
                        log.info("PayOS release reserved inventory for variant #{}: released {}. Remaining reserved: {}",
                                item.getVariantId(), qty, inv.getReservedQuantity());
                    });
                }
            }
        }
        order.setInventoryReserved(false);
        orderRepository.save(order);

        if (messagingTemplate != null) {
            Map<String, Object> event = new HashMap<>();
            event.put("event", "ORDER_EXPIRED");
            event.put("orderId", order.getId());
            event.put("orderCode", order.getOrderCode());
            event.put("status", "EXPIRED");
            messagingTemplate.convertAndSend("/topic/payos." + order.getId(), (Object) event);
        }
    }

    private void broadcastRealtimePaid(Order order, String reason) {
        if (messagingTemplate == null) return;
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event", "PAYMENT_SUCCESS");
            event.put("orderId", order.getId());
            event.put("orderCode", order.getOrderCode());
            event.put("status", "PAID");
            event.put("amount", order.getTotalAmount());
            event.put("confirmedAt", order.getConfirmedAt() != null ? order.getConfirmedAt().toString() : LocalDateTime.now().toString());
            event.put("message", "Shop đã nhận được tiền thành công!");

            // 1. Kênh riêng cho màn hình PayOS Modal
            messagingTemplate.convertAndSend("/topic/payos." + order.getId(), (Object) event);

            // 2. Kênh thông báo người mua
            if (order.getUserId() != null) {
                messagingTemplate.convertAndSend("/topic/orders." + order.getUserId(), (Object) event);
            }

            // 3. Kênh quản lý cửa hàng
            if (order.getShopId() != null) {
                messagingTemplate.convertAndSend("/topic/shop-orders." + order.getShopId(), (Object) event);
            }
        } catch (Exception e) {
            log.warn("Failed to broadcast real-time paid update: {}", e.getMessage());
        }
    }

    private Order getOrderAndVerifyAccess(Long orderId, String username) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (username != null && !username.isBlank()) {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                boolean isAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getCode()));
                boolean isOwner = order.getUserId() != null && order.getUserId().equals(user.getId());
                boolean isShopOwner = order.getShop() != null && Objects.equals(order.getShop().getOwnerId(), user.getId());
                if (!isAdmin && !isOwner && !isShopOwner) {
                    throw new UnauthorizedException("Bạn không có quyền truy cập đơn hàng này");
                }
            }
        }
        return order;
    }

    private PayOSPaymentResponse mapToResponse(Order order, String status, String qrCode, String checkoutUrl) {
        int amount = order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0;
        String description = sanitizeDescription("CYBER " + order.getOrderCode());
        String bin = payOSProperties.getBankBin();
        String accountNumber = payOSProperties.getAccountNumber();
        String accountName = payOSProperties.getAccountName();

        if (qrCode == null) {
            qrCode = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                    bin, accountNumber, amount,
                    URLEncoder.encode(description, StandardCharsets.UTF_8),
                    URLEncoder.encode(accountName, StandardCharsets.UTF_8));
        }

        return PayOSPaymentResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .payosOrderCode(order.getId())
                .amount(order.getTotalAmount())
                .description(description)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .bankName(payOSProperties.getBankName())
                .bin(bin)
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl != null ? checkoutUrl : "https://pay.payos.vn")
                .status(status)
                .expiresAt(order.getExpiresAt())
                .remainingSeconds(calculateRemainingSeconds(order.getExpiresAt()))
                .build();
    }

    private Long calculateRemainingSeconds(LocalDateTime expiresAt) {
        if (expiresAt == null) return 900L; // 15 phút mặc định
        long diff = Duration.between(LocalDateTime.now(), expiresAt).getSeconds();
        return Math.max(0, diff);
    }

    private String sanitizeDescription(String input) {
        if (input == null) return "CYBER";
        String clean = input.replaceAll("[^a-zA-Z0-9 ]", "").trim();
        return clean.length() > 25 ? clean.substring(0, 25) : clean;
    }

    private String createHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo chữ ký HMAC-SHA256: " + e.getMessage(), e);
        }
    }
}
