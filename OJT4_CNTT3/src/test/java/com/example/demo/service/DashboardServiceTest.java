package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.response.*;
import com.example.demo.entity.*;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.RevenueService;
import com.example.demo.service.impl.DashboardServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Dashboard Service Unit Tests")
class DashboardServiceTest extends BaseUnitTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private RevenueService revenueService;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private User admin;
    private User shopOwner;
    private Shop shop;
    private Order order;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).username("admin").role(Role.ADMIN).build();
        shopOwner = User.builder().id(2L).username("shopowner").role(Role.SHOP_MANAGER).build();
        shop = Shop.builder().id(10L).name("Gadget Shop").ownerId(2L).status(ShopStatus.ACTIVE).build();

        order = Order.builder()
                .id(100L)
                .orderCode("ORD-100")
                .shopId(10L)
                .totalAmount(BigDecimal.valueOf(500000))
                .status(OrderStatus.DELIVERED)
                .paymentStatus(PaymentStatus.PAID)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getAdminSummary: calculates platform metrics correctly")
    void getAdminSummary_success() {
        when(orderRepository.findAll()).thenReturn(List.of(order));
        when(shopRepository.findAll()).thenReturn(List.of(shop));
        when(userRepository.count()).thenReturn(10L);
        when(productRepository.count()).thenReturn(50L);

        DashboardSummaryResponse res = dashboardService.getAdminSummary();

        assertNotNull(res);
        assertEquals(1, res.getTotalOrders());
        assertEquals(1, res.getDeliveredOrders());
        assertEquals(BigDecimal.valueOf(500000), res.getTotalRevenue());
        assertEquals(10L, res.getTotalUsers());
        assertEquals(50L, res.getTotalProducts());
        assertEquals(1L, res.getActiveShops());
    }

    @Test
    @DisplayName("getAdminRevenue: delegates to RevenueService")
    void getAdminRevenue_success() {
        AdminRevenueResponse expected = AdminRevenueResponse.builder().build();
        when(revenueService.getPlatformRevenue(null, "all", null)).thenReturn(expected);

        AdminRevenueResponse res = dashboardService.getAdminRevenue();
        assertNotNull(res);
        verify(revenueService).getPlatformRevenue(null, "all", null);
    }

    @Test
    @DisplayName("getAdminOrderStats: counts orders by status")
    void getAdminOrderStats_success() {
        when(orderRepository.findAll()).thenReturn(List.of(order));

        OrderStatsResponse res = dashboardService.getAdminOrderStats();

        assertNotNull(res);
        assertEquals(1L, res.getTotalOrders());
        assertEquals(1L, res.getCountByStatus().get("DELIVERED"));
    }

    @Test
    @DisplayName("getAdminUserStats: counts users by role and status")
    void getAdminUserStats_success() {
        when(userRepository.findAll()).thenReturn(List.of(admin, shopOwner));

        UserStatsResponse res = dashboardService.getAdminUserStats();

        assertNotNull(res);
        assertEquals(2L, res.getTotalUsers());
        assertEquals(1L, res.getCountByRole().get("ADMIN"));
    }

    @Test
    @DisplayName("getShopSummary: unauthenticated throws UnauthorizedException")
    void getShopSummary_unauthorized() {
        assertThrows(UnauthorizedException.class, () -> dashboardService.getShopSummary(10L, null));
    }

    @Test
    @DisplayName("getShopSummary: user without permission throws ForbiddenException")
    void getShopSummary_forbidden() {
        User outsider = User.builder().id(99L).username("outsider").role(Role.ROLE_USER).build();
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 99L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> dashboardService.getShopSummary(10L, "outsider"));
    }

    @Test
    @DisplayName("getShopSummary: shop owner gets shop summary successfully")
    void getShopSummary_success() {
        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findByShopId(10L)).thenReturn(List.of(order));
        when(productRepository.countByShopIdAndStatus(10L, ProductStatus.ACTIVE)).thenReturn(5L);

        ShopDashboardSummaryResponse res = dashboardService.getShopSummary(10L, "shopowner");

        assertNotNull(res);
        assertEquals(1L, res.getTotalOrders());
        assertEquals(BigDecimal.valueOf(500000), res.getTotalRevenue());
        assertEquals(5L, res.getTotalProducts());
    }
}
