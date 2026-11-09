package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateReturnRequest;
import com.example.demo.dto.request.ProcessReturnRequest;
import com.example.demo.dto.response.ReturnResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.ReturnServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Return Service Unit Tests - Return/Refund Flow & 3-Day Return Window")
class ReturnServiceTest extends BaseUnitTest {

    @Mock
    private OrderReturnRepository orderReturnRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private ReturnServiceImpl returnService;

    private User customer;
    private User otherCustomer;
    private User shopOwner;
    private Shop shop;
    private Order order;

    @BeforeEach
    void setUp() {
        customer = User.builder()
                .id(10L)
                .username("customer")
                .fullName("Nguyen Van A")
                .role(Role.ROLE_USER)
                .build();

        otherCustomer = User.builder()
                .id(20L)
                .username("othercustomer")
                .fullName("Tran Van B")
                .role(Role.ROLE_USER)
                .build();

        shopOwner = User.builder()
                .id(1L)
                .username("shopowner")
                .role(Role.SHOP_MANAGER)
                .build();

        shop = Shop.builder()
                .id(100L)
                .name("Cyber Store")
                .ownerId(1L)
                .status(ShopStatus.ACTIVE)
                .build();

        order = Order.builder()
                .id(500L)
                .orderCode("ORD-500")
                .userId(10L)
                .shopId(100L)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(1500000))
                .deliveredAt(LocalDateTime.now().minusDays(1)) // Mới nhận hàng 1 ngày trước
                .build();
    }

    // =========================================================================
    // CREATE RETURN REQUEST & HẠN 3 NGÀY TESTS
    // =========================================================================

    @Test
    @DisplayName("Tạo yêu cầu trả hàng thành công khi đơn đã DELIVERED và trong hạn 3 ngày")
    void testCreateReturnRequest_Success_Within3Days() {
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));
        when(orderReturnRepository.existsByOrderIdAndStatusNotIn(eq(500L), any())).thenReturn(false);
        when(shopRepository.findById(100L)).thenReturn(Optional.of(shop));
        when(orderReturnRepository.save(any(OrderReturn.class))).thenAnswer(inv -> {
            OrderReturn r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        CreateReturnRequest request = CreateReturnRequest.builder()
                .reason("Sản phẩm lỗi kỹ thuật")
                .description("Màn hình bị sọc khi bật máy")
                .build();

        ReturnResponse response = returnService.createReturnRequest(500L, request, "customer");

        assertNotNull(response);
        assertEquals(ReturnStatus.REQUESTED, response.getStatus());
        assertEquals("Sản phẩm lỗi kỹ thuật", response.getReason());
        assertEquals(BigDecimal.valueOf(1500000), response.getRefundAmount());
        verify(orderReturnRepository).save(any(OrderReturn.class));
        verify(notificationService).createNotification(eq(1L), eq("RETURN_REQUESTED"), anyString(), anyString(), eq("RETURN"), eq(1L));
    }

    @Test
    @DisplayName("Tạo yêu cầu trả hàng thất bại khi đã QUÁ HẠN 3 NGÀY kể từ lúc nhận hàng -> 400 BadRequestException")
    void testCreateReturnRequest_BadRequest_ExpiredAfter3Days() {
        order.setDeliveredAt(LocalDateTime.now().minusDays(4)); // Đã nhận hàng 4 ngày trước (> 3 ngày)

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));

        CreateReturnRequest request = CreateReturnRequest.builder()
                .reason("Không ưng màu sắc")
                .description("Muốn trả lại")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                returnService.createReturnRequest(500L, request, "customer"));

        assertTrue(ex.getMessage().contains("quá thời hạn 3 ngày"));
        verify(orderReturnRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạo yêu cầu trả hàng thất bại khi đơn hàng CHƯA ĐƯỢC GIAO (chưa DELIVERED) -> 400 BadRequestException")
    void testCreateReturnRequest_BadRequest_WhenNotDelivered() {
        order.setStatus(OrderStatus.SHIPPED);

        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));

        CreateReturnRequest request = CreateReturnRequest.builder()
                .reason("Muốn đổi trả")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                returnService.createReturnRequest(500L, request, "customer"));

        assertTrue(ex.getMessage().contains("Chỉ có thể yêu cầu trả hàng khi đơn hàng đã được giao thành công"));
        verify(orderReturnRepository, never()).save(any());
    }

    @Test
    @DisplayName("Khách hàng khác không thể yêu cầu trả hàng cho đơn không phải của mình -> 403 ForbiddenException")
    void testCreateReturnRequest_Forbidden_WhenOtherCustomer() {
        when(userRepository.findByUsername("othercustomer")).thenReturn(Optional.of(otherCustomer));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));

        CreateReturnRequest request = CreateReturnRequest.builder()
                .reason("Lỗi")
                .build();

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                returnService.createReturnRequest(500L, request, "othercustomer"));

        assertTrue(ex.getMessage().contains("không thể yêu cầu trả hàng cho đơn hàng của người khác"));
        verify(orderReturnRepository, never()).save(any());
    }

    // =========================================================================
    // PROCESS RETURN REQUEST (SHOP DUYỆT / HOÀN TIỀN) TESTS
    // =========================================================================

    @Test
    @DisplayName("Shop duyệt yêu cầu trả hàng sang APPROVED thành công")
    void testProcessShopReturn_Success_Approved() {
        OrderReturn existingReturn = OrderReturn.builder()
                .id(1L)
                .orderId(500L)
                .requestedBy(10L)
                .reason("Hàng lỗi")
                .status(ReturnStatus.REQUESTED)
                .refundAmount(BigDecimal.valueOf(1500000))
                .build();

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(100L)).thenReturn(Optional.of(shop));
        when(orderReturnRepository.findById(1L)).thenReturn(Optional.of(existingReturn));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));
        when(orderReturnRepository.save(any(OrderReturn.class))).thenAnswer(inv -> inv.getArgument(0));

        ProcessReturnRequest processReq = ProcessReturnRequest.builder()
                .status(ReturnStatus.APPROVED)
                .resolutionNote("Shop đồng ý nhận lại kiện hàng để kiểm tra")
                .build();

        ReturnResponse response = returnService.processShopReturn(100L, 1L, processReq, "shopowner");

        assertNotNull(response);
        assertEquals(ReturnStatus.APPROVED, response.getStatus());
        assertEquals(1L, existingReturn.getProcessedBy());
        verify(notificationService).createNotification(eq(10L), eq("RETURN_STATUS_UPDATED"), anyString(), anyString(), eq("RETURN"), eq(1L));
    }

    @Test
    @DisplayName("Shop xác nhận REFUNDED (hoàn tiền) -> Đơn hàng tự động chuyển sang trạng thái RETURNED")
    void testProcessShopReturn_Success_Refunded_TransitionsOrderToReturned() {
        OrderReturn existingReturn = OrderReturn.builder()
                .id(1L)
                .orderId(500L)
                .requestedBy(10L)
                .reason("Hàng lỗi")
                .status(ReturnStatus.RECEIVED)
                .refundAmount(BigDecimal.valueOf(1500000))
                .build();

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(100L)).thenReturn(Optional.of(shop));
        when(orderReturnRepository.findById(1L)).thenReturn(Optional.of(existingReturn));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));
        when(orderReturnRepository.save(any(OrderReturn.class))).thenAnswer(inv -> inv.getArgument(0));

        ProcessReturnRequest processReq = ProcessReturnRequest.builder()
                .status(ReturnStatus.REFUNDED)
                .resolutionNote("Đã chuyển khoản hoàn tiền 100% cho khách")
                .build();

        ReturnResponse response = returnService.processShopReturn(100L, 1L, processReq, "shopowner");

        assertNotNull(response);
        assertEquals(ReturnStatus.REFUNDED, response.getStatus());
        assertEquals(OrderStatus.RETURNED, order.getStatus()); // Đơn hàng tự động chuyển RETURNED
        verify(orderRepository).save(order);
    }

    @Test
    @DisplayName("Shop khác cố tình can thiệp duyệt đơn đổi trả của Shop khác -> 400 BadRequestException")
    void testProcessShopReturn_BadRequest_WhenOrderBelongsToOtherShop() {
        Shop shop200 = Shop.builder().id(200L).ownerId(1L).status(ShopStatus.ACTIVE).build();

        OrderReturn existingReturn = OrderReturn.builder()
                .id(1L)
                .orderId(500L) // Đơn hàng thuộc shop 100L
                .requestedBy(10L)
                .status(ReturnStatus.REQUESTED)
                .build();

        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(200L)).thenReturn(Optional.of(shop200));
        when(orderReturnRepository.findById(1L)).thenReturn(Optional.of(existingReturn));
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));

        ProcessReturnRequest processReq = ProcessReturnRequest.builder()
                .status(ReturnStatus.APPROVED)
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                returnService.processShopReturn(200L, 1L, processReq, "shopowner"));

        assertTrue(ex.getMessage().contains("không thuộc cửa hàng #200"));
    }
}

