package com.example.demo.controller;

import com.example.demo.dto.request.CreateOrderItemRequest;
import com.example.demo.dto.request.CreateOrderRequest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.dto.response.OrderTrackingResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.OrderStatus;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderController Unit Tests")
class OrderControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private OrderService orderService;

    @Mock
    private Principal principal;

    @InjectMocks
    private OrderController orderController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(orderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /orders: creates order successfully")
    void createOrder_success() throws Exception {
        CreateOrderItemRequest itemReq = CreateOrderItemRequest.builder()
                .variantId(1L)
                .quantity(2)
                .price(BigDecimal.valueOf(100000))
                .build();

        CreateOrderRequest req = CreateOrderRequest.builder()
                .recipientName("Nguyen Van A")
                .recipientPhone("0987654321")
                .shippingAddress("123 Street")
                .items(List.of(itemReq))
                .build();

        OrderResponse orderRes = OrderResponse.builder().id(10L).orderCode("ORD-10").build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.createOrder(any(CreateOrderRequest.class), eq("testuser"))).thenReturn(orderRes);

        mockMvc.perform(post("/orders")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value("ORD-10"));
    }

    @Test
    @DisplayName("GET /orders: returns user order list")
    void getUserOrders_success() throws Exception {
        OrderResponse orderRes = OrderResponse.builder().id(10L).orderCode("ORD-10").build();
        PageResponse<OrderResponse> pageRes = PageResponse.<OrderResponse>builder()
                .content(List.of(orderRes))
                .totalElements(1L)
                .build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.getUserOrders(eq("testuser"), any(), anyInt(), anyInt())).thenReturn(pageRes);

        mockMvc.perform(get("/orders").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /orders/{id}: returns order details")
    void getOrderDetail_success() throws Exception {
        OrderResponse orderRes = OrderResponse.builder().id(10L).orderCode("ORD-10").build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.getOrderDetail(10L, "testuser")).thenReturn(orderRes);

        mockMvc.perform(get("/orders/10").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value("ORD-10"));
    }

    @Test
    @DisplayName("GET /orders/{id}/tracking: returns tracking info")
    void getOrderTracking_success() throws Exception {
        OrderTrackingResponse trackingRes = OrderTrackingResponse.builder()
                .orderId(10L)
                .orderCode("ORD-10")
                .status(OrderStatus.SHIPPED)
                .build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.getOrderTracking(10L, "testuser")).thenReturn(trackingRes);

        mockMvc.perform(get("/orders/10/tracking").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value("ORD-10"));
    }

    @Test
    @DisplayName("PATCH /orders/{id}/confirm-delivery: confirms delivery")
    void confirmDelivery_success() throws Exception {
        OrderResponse orderRes = OrderResponse.builder().id(10L).status(OrderStatus.DELIVERED).build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.confirmOrderDelivery(10L, "testuser")).thenReturn(orderRes);

        mockMvc.perform(patch("/orders/10/confirm-delivery").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DELIVERED"));
    }

    @Test
    @DisplayName("POST /orders/{id}/cancel: cancels order")
    void cancelOrder_success() throws Exception {
        OrderResponse orderRes = OrderResponse.builder().id(10L).status(OrderStatus.CANCELLED).build();

        when(principal.getName()).thenReturn("testuser");
        when(orderService.cancelOrder(eq(10L), any(), eq("testuser"))).thenReturn(orderRes);

        mockMvc.perform(patch("/orders/10/cancel").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }
}
