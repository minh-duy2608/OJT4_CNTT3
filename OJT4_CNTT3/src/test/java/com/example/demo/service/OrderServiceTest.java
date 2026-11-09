package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.UpdateOrderStatusRequest;
import com.example.demo.dto.response.OrderResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Order Service Unit Tests - Update Shop Order Status")
class OrderServiceTest extends BaseUnitTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User ownerUser;
    private User otherUser;
    private Shop shop;
    private Order order;

    @BeforeEach
    void setUp() {
        ownerUser = User.builder()
                .id(1L)
                .username("shopowner")
                .email("owner@shop.com")
                .role(Role.SHOP_MANAGER)
                .build();

        otherUser = User.builder()
                .id(2L)
                .username("otheruser")
                .email("other@user.com")
                .role(Role.ROLE_USER)
                .build();

        shop = Shop.builder()
                .id(10L)
                .name("Cyber Flagship Store")
                .ownerId(1L)
                .status(ShopStatus.ACTIVE)
                .build();

        order = Order.builder()
                .id(100L)
                .orderCode("ORD-100-XYZ")
                .shopId(10L)
                .userId(5L)
                .recipientName("Nguyen Van A")
                .recipientPhone("0987654321")
                .shippingAddress("123 Hanoi")
                .subtotal(BigDecimal.valueOf(1000000))
                .totalAmount(BigDecimal.valueOf(1000000))
                .status(OrderStatus.SHIPPED)
                .paymentStatus(PaymentStatus.UNPAID)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    @Test
    @DisplayName("Cập nhật trạng thái hợp lệ sang DELIVERED -> Trả đúng status, cập nhật deliveredAt, paymentStatus PAID và ghi audit log")
    void testUpdateShopOrderStatus_Success_Delivered() {
        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.DELIVERED)
                .build();

        OrderResponse response = orderService.updateShopOrderStatus(10L, 100L, request, "shopowner");

        assertNotNull(response);
        assertEquals(OrderStatus.DELIVERED, response.getStatus());
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
        assertNotNull(order.getDeliveredAt());
        verify(orderRepository).save(order);
        verify(auditLogService).log(eq(1L), eq("ORDER_DELIVERED"), eq("ORDER"), eq("100"), eq(10L), anyString());
    }

    @Test
    @DisplayName("User khác shop cập nhật -> Bị từ chối 403 Forbidden")
    void testUpdateShopOrderStatus_Forbidden_WhenOtherUser() {
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 2L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.DELIVERED)
                .build();

        assertThrows(ForbiddenException.class, () ->
                orderService.updateShopOrderStatus(10L, 100L, request, "otheruser"));

        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cửa hàng không tồn tại -> Trả về 404 ResourceNotFoundException")
    void testUpdateShopOrderStatus_NotFound_Shop() {
        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.CONFIRMED)
                .build();

        assertThrows(ResourceNotFoundException.class, () ->
                orderService.updateShopOrderStatus(999L, 100L, request, "shopowner"));
    }

    @Test
    @DisplayName("Đơn hàng không thuộc về shop truyền vào -> Trả về 404 ResourceNotFoundException")
    void testUpdateShopOrderStatus_NotFound_OrderMismatchShop() {
        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        // Shop trong url là 20L, nhưng đơn hàng thuộc shop 10L
        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.DELIVERED)
                .build();

        assertThrows(ResourceNotFoundException.class, () ->
                orderService.updateShopOrderStatus(20L, 100L, request, "shopowner"));
    }

    @Test
    @DisplayName("Transition trạng thái sai (PENDING nhảy cóc sang DELIVERED) -> Bị từ chối 400 BadRequestException")
    void testUpdateShopOrderStatus_InvalidTransition_PendingToDelivered() {
        order.setStatus(OrderStatus.PENDING);

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.DELIVERED)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                orderService.updateShopOrderStatus(10L, 100L, request, "shopowner"));

        assertTrue(ex.getMessage().contains("Luồng chuyển trạng thái không hợp lệ"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn hàng đã HỦY (CANCELLED) không thể chuyển sang trạng thái khác -> 400 BadRequestException")
    void testUpdateShopOrderStatus_InvalidTransition_CancelledOrder() {
        order.setStatus(OrderStatus.CANCELLED);

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.CONFIRMED)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                orderService.updateShopOrderStatus(10L, 100L, request, "shopowner"));

        assertTrue(ex.getMessage().contains("ĐÃ HỦY"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn hàng đã DELIVERED không thể chuyển ngược về SHIPPED -> 400 BadRequestException")
    void testUpdateShopOrderStatus_InvalidTransition_DeliveredToShipped() {
        order.setStatus(OrderStatus.DELIVERED);

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.SHIPPED)
                .build();

        assertThrows(BadRequestException.class, () ->
                orderService.updateShopOrderStatus(10L, 100L, request, "shopowner"));

        verify(orderRepository, never()).save(any());
    }
}

