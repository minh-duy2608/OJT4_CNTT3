package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.response.AdminRevenueResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.RevenueServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@DisplayName("Revenue Service Unit Tests")
class RevenueServiceTest extends BaseUnitTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RevenueServiceImpl revenueService;

    private User admin;
    private User normalUser;
    private Shop shop;
    private Order orderDelivered;
    private Order orderCancelled;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).username("admin").role(Role.ADMIN).build();
        normalUser = User.builder().id(2L).username("client").role(Role.ROLE_USER).build();
        shop = Shop.builder().id(10L).name("Gadget Shop").ownerId(2L).status(ShopStatus.ACTIVE).build();

        orderDelivered = Order.builder()
                .id(100L)
                .orderCode("ORD-100")
                .shopId(10L)
                .totalAmount(BigDecimal.valueOf(200000))
                .status(OrderStatus.DELIVERED)
                .paymentStatus(PaymentStatus.PAID)
                .createdAt(LocalDateTime.now())
                .build();

        orderCancelled = Order.builder()
                .id(101L)
                .orderCode("ORD-101")
                .shopId(10L)
                .totalAmount(BigDecimal.valueOf(100000))
                .status(OrderStatus.CANCELLED)
                .paymentStatus(PaymentStatus.UNPAID)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getPlatformRevenue: unauthenticated throws UnauthorizedException")
    void getPlatformRevenue_unauthenticated() {
        assertThrows(UnauthorizedException.class, () -> revenueService.getPlatformRevenue(null, "7d", null));
        assertThrows(UnauthorizedException.class, () -> revenueService.getPlatformRevenue(null, "7d", "  "));
    }

    @Test
    @DisplayName("getPlatformRevenue: user not found throws ResourceNotFoundException")
    void getPlatformRevenue_userNotFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> revenueService.getPlatformRevenue(null, "7d", "unknown"));
    }

    @Test
    @DisplayName("getPlatformRevenue: non-admin throws ForbiddenException")
    void getPlatformRevenue_forbidden() {
        when(userRepository.findByUsername("client")).thenReturn(Optional.of(normalUser));
        assertThrows(ForbiddenException.class, () -> revenueService.getPlatformRevenue(null, "7d", "client"));
    }

    @Test
    @DisplayName("getPlatformRevenue: admin successfully gets platform revenue breakdown")
    void getPlatformRevenue_adminSuccess() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(orderRepository.findAll(any(Sort.class))).thenReturn(List.of(orderDelivered, orderCancelled));
        when(shopRepository.findAll()).thenReturn(List.of(shop));
        when(userRepository.findById(2L)).thenReturn(Optional.of(normalUser));

        AdminRevenueResponse response = revenueService.getPlatformRevenue(null, "7d", "admin");

        assertNotNull(response);
        assertEquals(2L, response.getTotalOrders());
        assertEquals(1L, response.getCompletedOrders());
        assertEquals(1L, response.getCancelledOrders());
        assertEquals(BigDecimal.valueOf(200000), response.getTotalRevenue());
        assertEquals(BigDecimal.valueOf(200000), response.getGrossMerchandiseValue());
        assertFalse(response.getShopRevenues().isEmpty());
        assertFalse(response.getDailyRevenues().isEmpty());
    }

    @Test
    @DisplayName("getPlatformRevenue: filter by targetShopId filters orders correctly")
    void getPlatformRevenue_filterShop() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(orderRepository.findAll(any(Sort.class))).thenReturn(List.of(orderDelivered, orderCancelled));
        when(shopRepository.findAll()).thenReturn(List.of(shop));

        AdminRevenueResponse response = revenueService.getPlatformRevenue(10L, "7d", "admin");

        assertNotNull(response);
        assertEquals(2L, response.getTotalOrders());
    }
}

