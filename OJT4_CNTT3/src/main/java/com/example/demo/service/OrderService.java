package com.example.demo.service;

import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.OrderTrackingResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.OrderStatus;

public interface OrderService {

    OrderResponse createOrder(CreateOrderRequest request, String currentUsername);

    PageResponse<OrderResponse> getUserOrders(String currentUsername, OrderStatus status, int page, int size);

    OrderResponse getOrderDetail(Long orderId, String currentUsername);

    /**
     * Khách hàng xác nhận đã nhận hàng (chuyển sang DELIVERED, ghi deliveredAt, chống xác nhận lặp)
     */
    OrderResponse confirmOrderDelivery(Long orderId, String currentUsername);

    /**
     * STT 102: GET /orders/{orderId}/tracking - Theo dõi trạng thái đơn hàng (CLIENT)
     */
    OrderTrackingResponse getOrderTracking(Long orderId, String currentUsername);

    OrderResponse cancelOrder(Long orderId, String reason, String currentUsername);

    PageResponse<OrderResponse> getAdminOrders(Long shopId, OrderStatus status, int page, int size, String currentUsername);

    OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request, String currentUsername);

    PageResponse<OrderResponse> getShopOrders(Long shopId, OrderStatus status, int page, int size, String currentUsername);

    OrderResponse updateShopOrderStatus(Long shopId, Long orderId, UpdateOrderStatusRequest request, String currentUsername);
}

