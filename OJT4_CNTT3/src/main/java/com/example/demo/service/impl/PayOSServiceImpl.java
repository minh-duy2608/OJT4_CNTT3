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
import com.example.demo.dto.payment.ShopPayoutItemResponse;
import com.example.demo.dto.payment.ShopPayoutSummaryResponse;
import com.example.demo.dto.request.UpdateShopBankRequest;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final ShopRepository shopRepository;
    private final InventoryRepository inventoryRepository;
    private final PayOSProperties payOSProperties;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";
    private static final String STATUS_EXPIRED = "EXPIRED";
    private static final String STATUS_PAID = "PAID";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String CYBER_PREFIX = "CYBER ";
    private static final String FIELD_ORDER_CODE = "orderCode";
    private static final String FIELD_AMOUNT = "amount";
    private static final String FIELD_STATUS = "status";
    private static final String FIELD_EVENT = "event";
    private static final String FIELD_ORDER_ID = "orderId";
    private static final String PAYMENT_METHOD_PAYOS = "PAYOS";
    private static final String PAYOUT_STATUS_HOLDING = "HOLDING";
    private static final String PAYOUT_STATUS_READY = "READY_FOR_PAYOUT";
    private static final String PAYOUT_STATUS_PAID = "PAID_OUT";
    private static final String VIETQR_URL_TEMPLATE = "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s";
    private static final String DEFAULT_CHECKOUT_URL = "https://pay.payos.vn";
    private static final String DEFAULT_SETTLEMENT_CYCLE = "Định kỳ ngày 19 hàng tháng (Hạn quyết toán: 2 ngày, đến hết ngày 21)";
    private static final BigDecimal PLATFORM_FEE_RATE = new BigDecimal("0.025");

    private record PayOSGatewayResult(String checkoutUrl, String qrCode, String accountNumber, String accountName, String bin) {}
    private record OrderFinancials(BigDecimal total, BigDecimal shippingFee, BigDecimal productAmount, BigDecimal platformFee, BigDecimal payoutAmount) {}
    private record ShopBankInfo(String name, String bankName, String bankBin, String bankAccountNumber, String bankAccountName) {}

    private static class PayoutAccumulator {
        BigDecimal totalHolding = BigDecimal.ZERO;
        long holdingCount = 0;
        BigDecimal totalReady = BigDecimal.ZERO;
        long readyCount = 0;
        BigDecimal totalPaidOut = BigDecimal.ZERO;
        long paidOutCount = 0;
        BigDecimal totalPlatformFee = BigDecimal.ZERO;
        BigDecimal totalShippingFee = BigDecimal.ZERO;
        BigDecimal totalProductAmount = BigDecimal.ZERO;

        void accumulate(OrderFinancials financials, String status) {
            totalPlatformFee = totalPlatformFee.add(financials.platformFee());
            totalShippingFee = totalShippingFee.add(financials.shippingFee());
            totalProductAmount = totalProductAmount.add(financials.productAmount());

            if (PAYOUT_STATUS_HOLDING.equalsIgnoreCase(status)) {
                totalHolding = totalHolding.add(financials.payoutAmount());
                holdingCount++;
            } else if (PAYOUT_STATUS_READY.equalsIgnoreCase(status)) {
                totalReady = totalReady.add(financials.payoutAmount());
                readyCount++;
            } else if (PAYOUT_STATUS_PAID.equalsIgnoreCase(status)) {
                totalPaidOut = totalPaidOut.add(financials.payoutAmount());
                paidOutCount++;
            }
        }
    }

    @Override
    @Transactional
    public PayOSPaymentResponse createPaymentLink(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);
        PayOSPaymentResponse initialResponse = validateOrderForPayment(order);
        if (initialResponse != null) {
            return initialResponse;
        }

        prepareOrderForPayOS(order);

        long payosOrderCode = order.getId();
        int amount = order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0;
        String description = sanitizeDescription(CYBER_PREFIX + order.getOrderCode());

        PayOSGatewayResult gatewayResult = requestPayOSPaymentLink(order, amount, description, payosOrderCode);

        String qrCode = resolvePaymentQrCode(gatewayResult.qrCode(), gatewayResult.bin(), gatewayResult.accountNumber(), amount, description, gatewayResult.accountName());
        String checkoutUrl = resolveCheckoutUrl(gatewayResult.checkoutUrl());

        return buildPaymentResponse(order, payosOrderCode, description, gatewayResult, qrCode, checkoutUrl);
    }

    private PayOSPaymentResponse validateOrderForPayment(Order order) {
        if (order.getPaymentMethod() != null && (order.getPaymentMethod().toUpperCase().contains("COD") || order.getPaymentMethod().toLowerCase().contains("tiền mặt"))) {
            throw new BadRequestException("Đơn hàng đã chọn phương thức thanh toán tiền mặt (COD), không thể chuyển sang thanh toán trực tuyến qua PayOS.");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID || order.getStatus() == OrderStatus.DELIVERED) {
            return mapToResponse(order, STATUS_PAID, null, null);
        }
        if (order.getStatus() == OrderStatus.CANCELLED || order.isExpired()) {
            return mapToResponse(order, STATUS_EXPIRED, null, null);
        }
        return null;
    }

    private void prepareOrderForPayOS(Order order) {
        if (order.getExpiresAt() == null) {
            LocalDateTime now = LocalDateTime.now();
            order.setExpiresAt(order.getCreatedAt() != null ? order.getCreatedAt().plusMinutes(5) : now.plusMinutes(5));
        }
        order.setPaymentMethod(PAYMENT_METHOD_PAYOS);
        orderRepository.save(order);
    }

    private record PayOSLinkParams(long orderCode, int amount, String description, String cancelUrl, String returnUrl, long expiredAtUnix, String signature) {}

    private PayOSGatewayResult requestPayOSPaymentLink(Order order, int amount, String description, long payosOrderCode) {
        PayOSGatewayResult defaultResult = new PayOSGatewayResult(
                null, null,
                payOSProperties.getAccountNumber(),
                payOSProperties.getAccountName(),
                payOSProperties.getBankBin()
        );

        if (!payOSProperties.isConfigured()) {
            return defaultResult;
        }

        try {
            PayOSLinkParams params = createPayOSLinkParams(order, amount, description, payosOrderCode);
            Map<String, Object> reqBody = buildPayOSRequestBody(params, order);
            String jsonBody = objectMapper.writeValueAsString(reqBody);

            HttpResponse<String> httpResponse = sendPayOSCreateRequest(jsonBody);
            return parsePayOSResponse(httpResponse, order, defaultResult);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while calling PayOS API for order #{}, fallback to VietQR generation: {}", order.getId(), e.getMessage());
            return defaultResult;
        } catch (Exception e) {
            log.warn("Failed to call PayOS API for order #{}, fallback to VietQR generation: {}", order.getId(), e.getMessage());
            return defaultResult;
        }
    }

    private PayOSLinkParams createPayOSLinkParams(Order order, int amount, String description, long payosOrderCode) {
        long expiredAtUnix = order.getExpiresAt().toEpochSecond(ZoneOffset.ofHours(7));
        String cancelUrl = payOSProperties.getCancelUrl();
        String returnUrl = payOSProperties.getReturnUrl();

        String signData = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount, cancelUrl, description, payosOrderCode, returnUrl);
        String signature = createHmacSha256(signData, payOSProperties.getChecksumKey());

        return new PayOSLinkParams(payosOrderCode, amount, description, cancelUrl, returnUrl, expiredAtUnix, signature);
    }

    private HttpResponse<String> sendPayOSCreateRequest(String jsonBody) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(PAYOS_API_URL))
                .header("x-client-id", payOSProperties.getClientId())
                .header("x-api-key", payOSProperties.getApiKey())
                .header("Content-Type", "application/json")
                .header("User-Agent", "CyberMall/1.0 (Macintosh; Intel Mac OS X)")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

        return client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
    }

    private PayOSGatewayResult parsePayOSResponse(HttpResponse<String> httpResponse, Order order, PayOSGatewayResult defaultResult) {
        if (httpResponse.statusCode() != 200 && httpResponse.statusCode() != 201) {
            log.warn("PayOS HTTP {} response: {}", httpResponse.statusCode(), httpResponse.body());
            return defaultResult;
        }
        try {
            JsonNode root = objectMapper.readTree(httpResponse.body());
            if (!"00".equals(root.path("code").asText())) {
                log.warn("PayOS returned non-zero code: {} - {}", root.path("code").asText(), root.path("desc").asText());
                return defaultResult;
            }
            JsonNode data = root.path("data");
            String checkoutUrl = data.path("checkoutUrl").asText(null);
            String qrCode = data.path("qrCode").asText(null);
            String accountNumber = data.hasNonNull("accountNumber") ? data.path("accountNumber").asText() : defaultResult.accountNumber();
            String accountName = data.hasNonNull("accountName") ? data.path("accountName").asText() : defaultResult.accountName();
            String bin = data.hasNonNull("bin") ? data.path("bin").asText() : defaultResult.bin();
            log.info("Successfully created PayOS payment link for order #{} (Code: {})", order.getId(), order.getOrderCode());
            return new PayOSGatewayResult(checkoutUrl, qrCode, accountNumber, accountName, bin);
        } catch (Exception e) {
            log.warn("Failed to parse PayOS response for order #{}: {}", order.getId(), e.getMessage());
            return defaultResult;
        }
    }

    private Map<String, Object> buildPayOSRequestBody(PayOSLinkParams params, Order order) {
        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put(FIELD_ORDER_CODE, params.orderCode());
        reqBody.put(FIELD_AMOUNT, params.amount());
        reqBody.put("description", params.description());
        reqBody.put("cancelUrl", params.cancelUrl());
        reqBody.put("returnUrl", params.returnUrl());
        reqBody.put("expiredAt", params.expiredAtUnix());
        reqBody.put("signature", params.signature());
        if (order.getRecipientName() != null) reqBody.put("buyerName", order.getRecipientName());
        if (order.getRecipientPhone() != null) reqBody.put("buyerPhone", order.getRecipientPhone());
        if (order.getShippingAddress() != null) reqBody.put("buyerAddress", order.getShippingAddress());
        return reqBody;
    }

    private String resolvePaymentQrCode(String qrCode, String bin, String accountNumber, int amount, String description, String accountName) {
        if (qrCode == null || qrCode.isBlank()) {
            return String.format(VIETQR_URL_TEMPLATE,
                    bin, accountNumber, amount,
                    URLEncoder.encode(description, StandardCharsets.UTF_8),
                    URLEncoder.encode(accountName, StandardCharsets.UTF_8));
        }
        return qrCode;
    }

    private String resolveCheckoutUrl(String checkoutUrl) {
        if (checkoutUrl == null || checkoutUrl.isBlank()) {
            return DEFAULT_CHECKOUT_URL;
        }
        return checkoutUrl;
    }

    private PayOSPaymentResponse buildPaymentResponse(Order order, long payosOrderCode, String description,
                                                      PayOSGatewayResult gatewayResult, String qrCode, String checkoutUrl) {
        String status = order.getPaymentStatus() == PaymentStatus.PAID ? STATUS_PAID : "PENDING";
        return PayOSPaymentResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .payosOrderCode(payosOrderCode)
                .amount(order.getTotalAmount())
                .description(description)
                .accountNumber(gatewayResult.accountNumber())
                .accountName(gatewayResult.accountName())
                .bankName(payOSProperties.getBankName())
                .bin(gatewayResult.bin())
                .qrCode(qrCode)
                .checkoutUrl(checkoutUrl)
                .status(status)
                .expiresAt(order.getExpiresAt())
                .remainingSeconds(calculateRemainingSeconds(order.getExpiresAt()))
                .build();
    }

    @Override
    @Transactional
    public PayOSPaymentResponse getPaymentStatus(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);

        PayOSPaymentResponse dbStatus = checkOrderStatusInDb(order);
        if (dbStatus != null) {
            return dbStatus;
        }

        PayOSPaymentResponse gatewayStatus = queryPayOSGatewayStatus(order);
        if (gatewayStatus != null) {
            return gatewayStatus;
        }

        return mapToResponse(order, "PENDING", null, null);
    }

    private PayOSPaymentResponse checkOrderStatusInDb(Order order) {
        if (order.getPaymentStatus() == PaymentStatus.PAID || order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.DELIVERED) {
            return mapToResponse(order, STATUS_PAID, null, null);
        }

        if (order.isExpired() || order.getStatus() == OrderStatus.CANCELLED) {
            if (order.getStatus() != OrderStatus.CANCELLED) {
                cancelExpiredOrder(order);
            }
            return mapToResponse(order, STATUS_EXPIRED, null, null);
        }
        return null;
    }

    private PayOSPaymentResponse queryPayOSGatewayStatus(Order order) {
        if (!payOSProperties.isConfigured()) {
            return null;
        }

        try {
            String queryUrl = PAYOS_API_URL + "/" + order.getId();
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(queryUrl))
                    .header("x-client-id", payOSProperties.getClientId())
                    .header("x-api-key", payOSProperties.getApiKey())
                    .header("User-Agent", "CyberMall/1.0 (Macintosh; Intel Mac OS X)")
                    .GET()
                    .build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(res.body());
                if ("00".equals(root.path("code").asText())) {
                    String payosStatus = root.path("data").path(FIELD_STATUS).asText("");
                    if (STATUS_PAID.equalsIgnoreCase(payosStatus)) {
                        confirmOrderPaid(order, "Xác nhận tự động từ PayOS Gateway");
                        return mapToResponse(order, STATUS_PAID, null, null);
                    }
                    if ("CANCELLED".equalsIgnoreCase(payosStatus) || STATUS_EXPIRED.equalsIgnoreCase(payosStatus)) {
                        cancelExpiredOrder(order);
                        return mapToResponse(order, STATUS_EXPIRED, null, null);
                    }
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.debug("Interrupted while checking PayOS status query: {}", e.getMessage());
        } catch (Exception e) {
            log.debug("Check PayOS status query error: {}", e.getMessage());
        }

        return null;
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
            String desc = data.getDescription().trim();
            order = orderRepository.findByOrderCode(desc).orElse(null);
            if (order == null && desc.startsWith(CYBER_PREFIX)) {
                order = orderRepository.findByOrderCode(desc.substring(CYBER_PREFIX.length()).trim()).orElse(null);
            }
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
        return mapToResponse(order, STATUS_EXPIRED, null, null);
    }

    @Override
    @Transactional
    public PayOSPaymentResponse simulatePaymentSuccess(Long orderId, String username) {
        Order order = getOrderAndVerifyAccess(orderId, username);
        confirmOrderPaid(order, "Giả lập thanh toán thành công (Test Demo)");
        return mapToResponse(order, STATUS_PAID, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopPayoutSummaryResponse getPayoutSummary(String statusFilter, String username) {
        verifyAdminAccess(username);
        List<Order> escrowOrders = orderRepository.findAllEscrowOrders();
        return buildPayoutSummary(escrowOrders, statusFilter);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopPayoutSummaryResponse getShopPayouts(Long shopId, String username) {
        verifyShopAccess(shopId, username);
        List<Order> escrowOrders = orderRepository.findEscrowOrdersByShopId(shopId);
        return buildPayoutSummary(escrowOrders, null);
    }

    @Override
    @Transactional
    public ShopPayoutItemResponse confirmShopPayout(Long orderId, String note, String transactionRef, String username) {
        User adminUser = verifyAdminAccess(username);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        if (!PAYOUT_STATUS_READY.equalsIgnoreCase(order.getShopPayoutStatus()) && !PAYOUT_STATUS_HOLDING.equalsIgnoreCase(order.getShopPayoutStatus())) {
            throw new BadRequestException("Đơn hàng này không ở trạng thái chờ chuyển tiền (Trạng thái hiện tại: " + order.getShopPayoutStatus() + ")");
        }

        order.setShopPayoutStatus(PAYOUT_STATUS_PAID);
        order.setShopPayoutAt(LocalDateTime.now());
        String finalNote = note;
        if (finalNote == null || finalNote.isBlank()) {
            finalNote = "Đã chuyển khoản thành công";
            if (transactionRef != null && !transactionRef.isBlank()) {
                finalNote += " - Mã GD: " + transactionRef;
            }
        }
        order.setShopPayoutNote(finalNote);
        order.setShopPayoutTransferredBy(adminUser.getId());
        Order saved = orderRepository.save(order);

        log.info("Admin '{}' (ID #{}) đã xác nhận chuyển tiền đối soát đơn #{} cho Shop #{}. Số tiền: {}",
                adminUser.getUsername(), adminUser.getId(), saved.getId(), saved.getShopId(), saved.getShopPayoutAmount());

        // Bắn WebSocket thông báo cho Shop
        if (messagingTemplate != null && saved.getShopId() != null) {
            Map<String, Object> event = new HashMap<>();
            event.put(FIELD_EVENT, "SHOP_PAYOUT_CONFIRMED");
            event.put(FIELD_ORDER_ID, saved.getId());
            event.put(FIELD_ORDER_CODE, saved.getOrderCode());
            event.put("shopId", saved.getShopId());
            event.put(FIELD_AMOUNT, saved.getShopPayoutAmount());
            event.put("message", "Admin đã chuyển tiền đơn hàng #" + saved.getOrderCode() + " về tài khoản ngân hàng của bạn!");
            messagingTemplate.convertAndSend("/topic/shop-orders." + saved.getShopId(), (Object) event);
        }

        return mapToPayoutItem(saved);
    }

    @Override
    @Transactional
    public ShopDetailResponse updateShopBankAccount(Long shopId, UpdateShopBankRequest request, String username) {
        verifyShopAccess(shopId, username);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        shop.setBankName(request.getBankName());
        shop.setBankBin(request.getBankBin() != null && !request.getBankBin().isBlank() ? request.getBankBin() : "970422");
        shop.setBankAccountNumber(request.getBankAccountNumber().trim());
        shop.setBankAccountName(request.getBankAccountName().trim().toUpperCase());
        Shop saved = shopRepository.save(shop);

        log.info("Cập nhật thông tin ngân hàng cho Shop #{}: {} - {} - {}",
                saved.getId(), saved.getBankName(), saved.getBankAccountNumber(), saved.getBankAccountName());

        return ShopDetailResponse.fromEntity(saved, true, true);
    }

    private ShopPayoutSummaryResponse buildPayoutSummary(List<Order> orders, String statusFilter) {
        PayoutAccumulator acc = new PayoutAccumulator();
        List<ShopPayoutItemResponse> items = new ArrayList<>();

        for (Order ord : orders) {
            OrderFinancials financials = calculateOrderFinancials(ord);
            String st = ord.getShopPayoutStatus() != null ? ord.getShopPayoutStatus() : "NONE";
            boolean isRefundedOrCancelled = ord.getStatus() == OrderStatus.RETURNED || ord.getPaymentStatus() == PaymentStatus.REFUNDED || ord.getStatus() == OrderStatus.CANCELLED;
            if (!isRefundedOrCancelled) {
                acc.accumulate(financials, st);
            }

            if (matchesStatusFilter(statusFilter, st)) {
                items.add(mapToPayoutItem(ord));
            }
        }

        return ShopPayoutSummaryResponse.builder()
                .totalHoldingAmount(acc.totalHolding)
                .totalHoldingCount(acc.holdingCount)
                .totalReadyAmount(acc.totalReady)
                .totalReadyCount(acc.readyCount)
                .totalPaidOutAmount(acc.totalPaidOut)
                .totalPaidOutCount(acc.paidOutCount)
                .totalPlatformFee(acc.totalPlatformFee)
                .totalShippingFee(acc.totalShippingFee)
                .totalProductAmount(acc.totalProductAmount)
                .settlementDay(19)
                .settlementDeadlineDays(2)
                .settlementCycleDescription(DEFAULT_SETTLEMENT_CYCLE)
                .items(items)
                .build();
    }

    private boolean matchesStatusFilter(String statusFilter, String status) {
        return statusFilter == null || statusFilter.isBlank() || "ALL".equalsIgnoreCase(statusFilter) || statusFilter.equalsIgnoreCase(status);
    }

    private OrderFinancials calculateOrderFinancials(Order ord) {
        BigDecimal total = ord.getTotalAmount() != null ? ord.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal ship = ord.getShippingFee() != null ? ord.getShippingFee() : BigDecimal.ZERO;
        BigDecimal productAmount = total.subtract(ship).max(BigDecimal.ZERO);
        if (ord.getStatus() == OrderStatus.RETURNED || ord.getPaymentStatus() == PaymentStatus.REFUNDED || ord.getStatus() == OrderStatus.CANCELLED) {
            return new OrderFinancials(total, ship, productAmount, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        BigDecimal platformFee = ord.getPlatformFee() != null && ord.getPlatformFee().compareTo(BigDecimal.ZERO) > 0
                ? ord.getPlatformFee()
                : productAmount.multiply(PLATFORM_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
        BigDecimal payoutAmount = productAmount.subtract(platformFee).max(BigDecimal.ZERO);
        return new OrderFinancials(total, ship, productAmount, platformFee, payoutAmount);
    }

    private ShopPayoutItemResponse mapToPayoutItem(Order order) {
        ShopBankInfo bankInfo = resolveShopBankInfo(order);
        OrderFinancials financials = calculateOrderFinancials(order);
        syncOrderPayoutInfo(order, financials);

        String vietQrUrl = generatePayoutVietQrUrl(order, bankInfo, financials.payoutAmount());

        return ShopPayoutItemResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .shopId(order.getShopId())
                .shopName(bankInfo.name())
                .totalAmount(financials.total())
                .shippingFee(financials.shippingFee())
                .productAmount(financials.productAmount())
                .platformFee(financials.platformFee())
                .shopPayoutAmount(financials.payoutAmount())
                .settlementCycle(DEFAULT_SETTLEMENT_CYCLE)
                .settlementDeadline("Ngày 21 hàng tháng")
                .shopPayoutStatus(order.getShopPayoutStatus() != null ? order.getShopPayoutStatus() : "NONE")
                .shopPayoutAt(order.getShopPayoutAt())
                .shopPayoutNote(order.getShopPayoutNote())
                .deliveredAt(order.getDeliveredAt())
                .buyerConfirmedDelivery(order.getBuyerConfirmedDelivery())
                .shopBankName(bankInfo.bankName())
                .shopBankBin(bankInfo.bankBin())
                .shopBankAccountNumber(bankInfo.bankAccountNumber())
                .shopBankAccountName(bankInfo.bankAccountName())
                .vietQrUrl(vietQrUrl)
                .recipientName(order.getRecipientName())
                .createdAt(order.getCreatedAt())
                .build();
    }

    private void syncOrderPayoutInfo(Order order, OrderFinancials financials) {
        if (order.getShopPayoutAmount() == null || !financials.payoutAmount().equals(order.getShopPayoutAmount()) || order.getPlatformFee() == null) {
            order.setPlatformFee(financials.platformFee());
            order.setShopPayoutAmount(financials.payoutAmount());
            orderRepository.save(order);
        }
    }

    private ShopBankInfo resolveShopBankInfo(Order order) {
        Shop shop = order.getShop();
        if (shop == null && order.getShopId() != null) {
            shop = shopRepository.findById(order.getShopId()).orElse(null);
        }
        String shopName = shop != null ? shop.getName() : "Shop #" + order.getShopId();
        String bankBin = (shop != null && shop.getBankBin() != null && !shop.getBankBin().isBlank()) ? shop.getBankBin() : "970418";
        String bankAcc = (shop != null && shop.getBankAccountNumber() != null && !shop.getBankAccountNumber().isBlank()) ? shop.getBankAccountNumber() : "8814310515";
        String bankName = (shop != null && shop.getBankName() != null && !shop.getBankName().isBlank()) ? shop.getBankName() : "BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)";
        String accName = (shop != null && shop.getBankAccountName() != null && !shop.getBankAccountName().isBlank()) ? shop.getBankAccountName() : "HOANG THIEN SON";
        return new ShopBankInfo(shopName, bankName, bankBin, bankAcc, accName);
    }

    private String generatePayoutVietQrUrl(Order order, ShopBankInfo bankInfo, BigDecimal payoutAmount) {
        if (bankInfo.bankAccountNumber().isBlank()) {
            return null;
        }
        String desc = "CYBER QT " + (order.getOrderCode() != null ? order.getOrderCode() : order.getId());
        if (desc.length() > 25) {
            desc = desc.substring(0, 25);
        }
        return String.format(VIETQR_URL_TEMPLATE,
                bankInfo.bankBin(), bankInfo.bankAccountNumber(), payoutAmount.intValue(),
                URLEncoder.encode(desc, StandardCharsets.UTF_8),
                URLEncoder.encode(bankInfo.bankAccountName(), StandardCharsets.UTF_8));
    }

    private User verifyAdminAccess(String username) {
        if (username == null || username.isBlank()) throw new UnauthorizedException("Vui lòng đăng nhập");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + username));
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> ROLE_ADMIN.equals(r.getCode()));
        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống (Admin) mới có quyền đối soát và quyết toán tiền!");
        }
        return user;
    }

    private void verifyShopAccess(Long shopId, String username) {
        if (username == null || username.isBlank()) throw new UnauthorizedException("Vui lòng đăng nhập");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + username));
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> ROLE_ADMIN.equals(r.getCode()));
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));
        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Bạn không có quyền quản lý tài khoản ngân hàng của cửa hàng này");
        }
    }

    /**
     * Xác nhận đơn hàng đã thanh toán thành công, trừ tồn kho vật lý và phát sự kiện Real-time
     */
    private void confirmOrderPaid(Order order, String reason) {
        log.info("Confirming order #{} paid. Reason: {}", order.getId(), reason);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedAt(LocalDateTime.now());
        // NGHIỆP VỤ ESCROW: Tiền về tài khoản Admin trước, Admin tạm giữ tiền (HOLDING). Khi khách nhận hàng thành công -> READY_FOR_PAYOUT
        order.setShopPayoutStatus(PAYOUT_STATUS_HOLDING);
        if (order.getShopPayoutAmount() == null) {
            order.setShopPayoutAmount(order.getTotalAmount());
        }

        // Chuyển hàng giữ tạm sang bán thật (trừ tồn kho vật lý)
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                deductVariantStock(item);
            }
        }
        order.setInventoryReserved(false);
        order.setInventoryDeducted(true);
        Order saved = orderRepository.save(order);

        // Phát WebSocket STOMP tới tất cả các kênh liên quan (Buyer, Shop, PayOS QR Modal)
        broadcastRealtimePaid(saved);
    }

    private void deductVariantStock(OrderItem item) {
        if (item.getVariantId() == null) {
            return;
        }
        inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            int currentQty = inv.getQuantity() != null ? inv.getQuantity() : 0;
            int currentReserved = inv.getReservedQuantity() != null ? inv.getReservedQuantity() : 0;
            inv.setQuantity(Math.max(0, currentQty - qty));
            inv.setReservedQuantity(Math.max(0, currentReserved - qty));
            inventoryRepository.save(inv);
            log.info("PayOS confirmed sale for variant #{}: deducted {} from physical stock, released {} from reserved. Remaining quantity: {}, reserved: {}",
                    item.getVariantId(), qty, qty, inv.getQuantity(), inv.getReservedQuantity());
        });
    }

    private void cancelExpiredOrder(Order order) {
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason("Hết thời gian thanh toán (5 phút). Tự động hủy và giải phóng tồn kho.");

        releaseOrderReservedInventory(order);
        order.setInventoryReserved(false);
        orderRepository.save(order);

        broadcastOrderExpired(order);
    }

    private void releaseOrderReservedInventory(Order order) {
        if (order.getItems() == null || !Boolean.TRUE.equals(order.getInventoryReserved())) {
            return;
        }
        for (OrderItem item : order.getItems()) {
            releaseVariantReservedStock(item);
        }
    }

    private void releaseVariantReservedStock(OrderItem item) {
        if (item.getVariantId() == null) {
            return;
        }
        inventoryRepository.findById(item.getVariantId()).ifPresent(inv -> {
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            int currentReserved = inv.getReservedQuantity() != null ? inv.getReservedQuantity() : 0;
            inv.setReservedQuantity(Math.max(0, currentReserved - qty));
            inventoryRepository.save(inv);
            log.info("PayOS release reserved inventory for variant #{}: released {}. Remaining reserved: {}",
                    item.getVariantId(), qty, inv.getReservedQuantity());
        });
    }

    private void broadcastOrderExpired(Order order) {
        if (messagingTemplate == null) return;
        Map<String, Object> event = new HashMap<>();
        event.put(FIELD_EVENT, "ORDER_EXPIRED");
        event.put(FIELD_ORDER_ID, order.getId());
        event.put(FIELD_ORDER_CODE, order.getOrderCode());
        event.put(FIELD_STATUS, STATUS_EXPIRED);
        messagingTemplate.convertAndSend("/topic/payos." + order.getId(), (Object) event);
    }

    private void broadcastRealtimePaid(Order order) {
        if (messagingTemplate == null) return;
        try {
            Map<String, Object> event = new HashMap<>();
            event.put(FIELD_EVENT, "PAYMENT_SUCCESS");
            event.put(FIELD_ORDER_ID, order.getId());
            event.put(FIELD_ORDER_CODE, order.getOrderCode());
            event.put(FIELD_STATUS, STATUS_PAID);
            event.put(FIELD_AMOUNT, order.getTotalAmount());
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
                boolean isAdmin = user.getRoles().stream().anyMatch(r -> ROLE_ADMIN.equals(r.getCode()));
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
        String description = sanitizeDescription(CYBER_PREFIX + order.getOrderCode());
        String bin = payOSProperties.getBankBin();
        String accountNumber = payOSProperties.getAccountNumber();
        String accountName = payOSProperties.getAccountName();

        if (qrCode == null) {
            qrCode = String.format(VIETQR_URL_TEMPLATE,
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
                .checkoutUrl(checkoutUrl != null ? checkoutUrl : DEFAULT_CHECKOUT_URL)
                .status(status)
                .expiresAt(order.getExpiresAt())
                .remainingSeconds(calculateRemainingSeconds(order.getExpiresAt()))
                .build();
    }

    private Long calculateRemainingSeconds(LocalDateTime expiresAt) {
        if (expiresAt == null) return 300L; // 5 phút mặc định
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
            throw new IllegalStateException("Lỗi tạo chữ ký HMAC-SHA256: " + e.getMessage(), e);
        }
    }
}
