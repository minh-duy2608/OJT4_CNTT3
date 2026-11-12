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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Order Service Unit Tests - Update Shop Order Status & Customer Confirm Delivery")
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
    private ProductVariantRepository productVariantRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private OrderReturnRepository orderReturnRepository;

    @Mock
    private ProductReviewRepository productReviewRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User ownerUser;
    private User customerUser;
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

        customerUser = User.builder()
                .id(5L)
                .username("customer")
                .email("customer@cyber.com")
                .role(Role.ROLE_USER)
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
        Shop shop20 = Shop.builder()
                .id(20L)
                .name("Shop 20")
                .ownerId(1L)
                .status(ShopStatus.ACTIVE)
                .build();

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop20));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        // Shop trong url là 20L, nhưng đơn hàng order.getShopId() là 10L
        UpdateOrderStatusRequest request = UpdateOrderStatusRequest.builder()
                .status(OrderStatus.DELIVERED)
                .build();

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                orderService.updateShopOrderStatus(20L, 100L, request, "shopowner"));

        assertTrue(ex.getMessage().contains("không thuộc về cửa hàng #20"));
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

    // =========================================================================
    // CUSTOMER CONFIRM DELIVERY TESTS
    // =========================================================================

    @Test
    @DisplayName("Khách hàng xác nhận nhận hàng thành công khi đơn đang SHIPPED -> Chuyển DELIVERED, lưu deliveredAt, paymentStatus PAID và ghi Audit Log")
    void testConfirmOrderDelivery_Success() {
        order.setStatus(OrderStatus.SHIPPED);
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.confirmOrderDelivery(100L, "customer");

        assertNotNull(response);
        assertEquals(OrderStatus.DELIVERED, response.getStatus());
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
        assertNotNull(response.getDeliveredAt());
        assertTrue(response.getCanReview());
        assertFalse(response.getCanConfirmDelivery());
        verify(orderRepository).save(order);
        verify(auditLogService).log(eq(5L), eq("CUSTOMER_CONFIRMED_DELIVERY"), eq("ORDER"), eq("100"), eq(10L), anyString());
    }

    @Test
    @DisplayName("Khách hàng xác nhận đơn hàng của người khác -> Bị từ chối 403 ForbiddenException")
    void testConfirmOrderDelivery_Forbidden_WhenOtherUser() {
        order.setStatus(OrderStatus.SHIPPED);
        // Order owner is 5L, user attempting is 2L
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                orderService.confirmOrderDelivery(100L, "otheruser"));

        assertTrue(ex.getMessage().contains("Bạn không có quyền xác nhận đơn hàng của người khác"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn hàng ở trạng thái CANCELLED -> Bị từ chối 400 BadRequestException")
    void testConfirmOrderDelivery_BadRequest_DuplicateConfirmation() {
        order.setStatus(OrderStatus.CANCELLED);

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                orderService.confirmOrderDelivery(100L, "customer"));

        assertTrue(ex.getMessage().contains("Chỉ có thể xác nhận nhận hàng"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đơn hàng chưa ở trạng thái SHIPPED (đang PENDING/CONFIRMED) -> Bị từ chối 400 BadRequestException")
    void testConfirmOrderDelivery_BadRequest_WhenNotShipped() {
        order.setStatus(OrderStatus.CONFIRMED);

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                orderService.confirmOrderDelivery(100L, "customer"));

        assertTrue(ex.getMessage().contains("Chỉ có thể xác nhận nhận hàng khi đơn hàng đang ở trạng thái đang giao"));
        verify(orderRepository, never()).save(any());
    }

    // =========================================================================
    // CUSTOMER ORDER DETAIL TESTS
    // =========================================================================

    @Test
    @DisplayName("Khách hàng sở hữu xem chi tiết đơn hàng -> Trả về đầy đủ timeline, items, hướng dẫn hoàn hàng, điều kiện review")
    void testGetOrderDetail_Success_Owner() {
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now().minusDays(1));
        order.setBuyerConfirmedDelivery(true);
        order.setItems(new ArrayList<>());

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderDetail(100L, "customer");

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals("ORD-100-XYZ", response.getOrderCode());
        assertNotNull(response.getTimeline());
        assertFalse(response.getTimeline().isEmpty());
        assertNotNull(response.getReturnInstructions());
        assertTrue(response.getCanReview());
        assertNotNull(response.getReviewConditionMessage());
    }

    @Test
    @DisplayName("User khác không sở hữu đơn và không phải shop/admin xem chi tiết -> Bị từ chối 403 ForbiddenException")
    void testGetOrderDetail_Forbidden_WhenOtherUser() {
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 2L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                orderService.getOrderDetail(100L, "otheruser"));

        assertTrue(ex.getMessage().contains("Bạn không có quyền"));
    }

    // =========================================================================
    // CANCEL ORDER TESTS (HỦY ĐƠN)
    // =========================================================================

    @Test
    @DisplayName("Hủy đơn hàng thành công khi đơn ở trạng thái PENDING -> Chuyển CANCELLED và lưu cancellationReason")
    void testCancelOrder_Success_WhenPending() {
        order.setStatus(OrderStatus.PENDING);
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.cancelOrder(100L, "Đổi ý không muốn mua nữa", "customer");

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELLED, response.getStatus());
        assertEquals("Đổi ý không muốn mua nữa", response.getCancellationReason());
        assertNotNull(response.getCancelledAt());
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Hủy đơn hàng thành công khi CONFIRMED -> Hoàn trả số lượng tồn kho")
    void testCancelOrder_Success_WhenConfirmed_RestoresInventory() {
        order.setStatus(OrderStatus.CONFIRMED);
        OrderItem item = OrderItem.builder()
                .id(1L)
                .order(order)
                .variantId(50L)
                .quantity(2)
                .build();
        order.setItems(new java.util.ArrayList<>(List.of(item)));

        Inventory inv = Inventory.builder()
                .variantId(50L)
                .quantity(10)
                .build();

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(inventoryRepository.findById(50L)).thenReturn(Optional.of(inv));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.cancelOrder(100L, "Trùng đơn", "customer");

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELLED, response.getStatus());
        assertEquals(12, inv.getQuantity()); // 10 + 2 restored
        verify(inventoryRepository).save(inv);
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Hủy đơn thất bại khi đơn đang SHIPPED hoặc DELIVERED -> 400 BadRequestException")
    void testCancelOrder_BadRequest_WhenShippedOrDelivered() {
        order.setStatus(OrderStatus.SHIPPED);
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                orderService.cancelOrder(100L, "Muốn hủy", "customer"));

        assertTrue(ex.getMessage().contains("Không thể hủy đơn hàng đang ở trạng thái: SHIPPED"));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("User khác không có quyền hủy đơn hàng của người khác -> 403 ForbiddenException")
    void testCancelOrder_Forbidden_WhenOtherUser() {
        order.setStatus(OrderStatus.PENDING);
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                orderService.cancelOrder(100L, "Hủy trộm", "otheruser"));

        assertTrue(ex.getMessage().contains("Bạn không có quyền hủy đơn hàng này"));
        verify(orderRepository, never()).save(any());
    }

    // =========================================================================
    // HẠN 3 NGÀY ĐỔI TRẢ TESTS
    // =========================================================================

    @Test
    @DisplayName("Kiểm tra hạn 3 ngày: Đơn hàng DELIVERED trong vòng 3 ngày (1 ngày trước) -> canReturn = true")
    void testGetOrderDetail_CanReturn_Within3Days_True() {
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now().minusDays(1));
        order.setBuyerConfirmedDelivery(true);
        order.setItems(new ArrayList<>());

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderDetail(100L, "customer");

        assertNotNull(response);
        assertTrue(response.getCanReturn());
    }

    @Test
    @DisplayName("Kiểm tra hạn 3 ngày: Đơn hàng DELIVERED quá 3 ngày (4 ngày trước) -> canReturn = false")
    void testGetOrderDetail_CanReturn_After3Days_False() {
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now().minusDays(4));

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customerUser));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderDetail(100L, "customer");

        assertNotNull(response);
        assertFalse(response.getCanReturn());
    }
}

