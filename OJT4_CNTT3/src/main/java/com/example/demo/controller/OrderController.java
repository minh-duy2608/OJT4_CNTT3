package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.OrderTrackingResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.OrderStatus;
import com.example.demo.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "16. Khách hàng & Admin - Đơn hàng", description = "Tạo đơn hàng, tra cứu lịch sử, hủy đơn và Admin duyệt trạng thái đơn")
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Tạo đơn hàng mới cho người dùng
     */
    @PostMapping({"/orders", "/api/v1/orders"})
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderResponse response = orderService.createOrder(request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đặt hàng thành công", response));
    }

    /**
     * Lấy danh sách đơn hàng của người dùng hiện tại
     */
    @GetMapping({"/orders", "/api/v1/orders"})
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getUserOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<OrderResponse> response = orderService.getUserOrders(username, status, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng thành công", response));
    }

    /**
     * Lấy chi tiết đơn hàng
     */
    @GetMapping({"/orders/{id}", "/api/v1/orders/{id}"})
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderDetail(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderResponse response = orderService.getOrderDetail(id, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi tiết đơn hàng thành công", response));
    }

    /**
     * STT 102: GET /orders/{orderId}/tracking - Theo dõi trạng thái đơn hàng (CLIENT)
     */
    @GetMapping({"/orders/{id}/tracking", "/api/v1/orders/{id}/tracking"})
    public ResponseEntity<ApiResponse<OrderTrackingResponse>> getOrderTracking(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderTrackingResponse response = orderService.getOrderTracking(id, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin theo dõi hành trình đơn hàng thành công", response));
    }

    /**
     * Người mua hủy đơn hàng (khi ở trạng thái PENDING hoặc CONFIRMED)
     */
    @PatchMapping({"/orders/{id}/cancel", "/api/v1/orders/{id}/cancel"})
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderResponse response = orderService.cancelOrder(id, reason, username);
        return ResponseEntity.ok(ApiResponse.success("Hủy đơn hàng thành công", response));
    }

    /**
     * Quản trị viên/Shop Manager: Lấy danh sách tất cả đơn hàng
     */
    @GetMapping({"/admin/orders", "/api/v1/admin/orders"})
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getAdminOrders(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<OrderResponse> response = orderService.getAdminOrders(shopId, status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng quản trị thành công", response));
    }

    /**
     * Quản trị viên/Shop Manager: Cập nhật trạng thái đơn hàng
     */
    @PatchMapping({"/admin/orders/{id}/status", "/api/v1/admin/orders/{id}/status"})
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderResponse response = orderService.updateOrderStatus(id, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái đơn hàng thành công", response));
    }
}

