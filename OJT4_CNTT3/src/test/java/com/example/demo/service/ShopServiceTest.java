package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.PublicShopDetailResponse;
import com.example.demo.dto.response.ShopRevenueDashboardResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.ShopServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Shop Service Unit Tests - Revenue Dashboard & Public Shop Page")
class ShopServiceTest extends BaseUnitTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private OrderReturnRepository orderReturnRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private ProductService productService;

    @InjectMocks
    private ShopServiceImpl shopService;

    private User ownerUser;
    private User otherUser;
    private Shop shop;

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
                .email("other@shop.com")
                .role(Role.ROLE_USER)
                .build();

        shop = Shop.builder()
                .id(10L)
                .ownerId(1L)
                .name("Cyber Flagship Store")
                .slug("cyber-flagship-store")
                .description("Cửa hàng công nghệ chính hãng")
                .status(ShopStatus.ACTIVE)
                .build();
    }

    // =========================================================================
    // 1. DASHBOARD DOANH THU SHOP TESTS
    // =========================================================================

    @Test
    @DisplayName("Thống kê doanh thu shop: Tính đúng DELIVERED (100%), RETURNED trừ hoàn, bỏ CANCELLED, và phân loại pending")
    void testGetShopRevenueDashboard_Success() {
        when(userRepository.findByUsername("shopowner")).thenReturn(Optional.of(ownerUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        Order orderDelivered = Order.builder()
                .id(101L)
                .orderCode("ORD-101")
                .shopId(10L)
                .status(OrderStatus.DELIVERED)
                .paymentStatus(PaymentStatus.PAID)
                .totalAmount(BigDecimal.valueOf(1000000))
                .createdAt(LocalDateTime.now().minusDays(5))
                .deliveredAt(LocalDateTime.now().minusDays(4))
                .build();

        Order orderReturned = Order.builder()
                .id(102L)
                .orderCode("ORD-102")
                .shopId(10L)
                .status(OrderStatus.RETURNED)
                .paymentStatus(PaymentStatus.PAID)
                .totalAmount(BigDecimal.valueOf(500000))
                .createdAt(LocalDateTime.now().minusDays(3))
                .deliveredAt(LocalDateTime.now().minusDays(2))
                .build();

        OrderReturn orderReturnRecord = OrderReturn.builder()
                .id(1L)
                .orderId(102L)
                .refundAmount(BigDecimal.valueOf(300000))
                .status(ReturnStatus.REFUNDED)
                .build();

        Order orderCancelled = Order.builder()
                .id(103L)
                .orderCode("ORD-103")
                .shopId(10L)
                .status(OrderStatus.CANCELLED)
                .paymentStatus(PaymentStatus.UNPAID)
                .totalAmount(BigDecimal.valueOf(200000))
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        Order orderShipped = Order.builder()
                .id(104L)
                .orderCode("ORD-104")
                .shopId(10L)
                .status(OrderStatus.SHIPPED)
                .paymentStatus(PaymentStatus.UNPAID)
                .totalAmount(BigDecimal.valueOf(400000))
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findByShopId(10L)).thenReturn(List.of(orderDelivered, orderReturned, orderCancelled, orderShipped));
        when(orderReturnRepository.findByOrderIdOrderByCreatedAtDesc(102L)).thenReturn(List.of(orderReturnRecord));

        ShopRevenueDashboardResponse response = shopService.getShopRevenueDashboard(10L, null, null, "day", "shopowner");

        assertNotNull(response);
        assertEquals(10L, response.getShopId());
        // grossRevenue = 1,000,000 (DELIVERED) + 500,000 (RETURNED) = 1,500,000
        assertEquals(BigDecimal.valueOf(1500000), response.getGrossRevenue());
        // refundAmount = 300,000
        assertEquals(BigDecimal.valueOf(300000), response.getRefundAmount());
        // netRevenue = 1,000,000 + (500,000 - 300,000) = 1,200,000
        assertEquals(BigDecimal.valueOf(1200000), response.getNetRevenue());
        // pendingRevenue = 400,000
        assertEquals(BigDecimal.valueOf(400000), response.getPendingRevenue());
        // cancelledRevenue = 200,000
        assertEquals(BigDecimal.valueOf(200000), response.getCancelledRevenue());

        assertEquals(4L, response.getTotalOrders());
        assertEquals(1L, response.getDeliveredOrders());
        assertEquals(1L, response.getReturnedOrders());
        assertEquals(1L, response.getCancelledOrders());
        assertEquals(1L, response.getPendingOrders());

        // Tiêu chí nghiệm thu: Quy tắc doanh thu được ghi rõ
        assertNotNull(response.getRevenueRule());
        assertTrue(response.getRevenueRule().contains("GIAO THÀNH CÔNG (DELIVERED)"));
        assertTrue(response.getRevenueRule().contains("TRẢ HÀNG / HOÀN TIỀN (RETURNED)"));

        // Tiêu chí nghiệm thu: Số liệu đối chiếu từng đơn
        assertEquals(4, response.getOrderReconciliations().size());
    }

    @Test
    @DisplayName("User không thuộc shop truy cập dashboard doanh thu -> 403 ForbiddenException")
    void testGetShopRevenueDashboard_Forbidden_WhenOtherUser() {
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 2L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                shopService.getShopRevenueDashboard(10L, null, null, "day", "otheruser"));

        assertTrue(ex.getMessage().contains("Bạn không có quyền"));
    }

    // =========================================================================
    // 2. TRANG CỬA HÀNG CÔNG KHAI & SẢN PHẨM TESTS
    // =========================================================================

    @Test
    @DisplayName("Lấy trang cửa hàng công khai theo shopId: trả thông tin shop, sản phẩm phân trang, category & brand lọc")
    void testGetPublicShopPage_Success_ById() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        Category cat = Category.builder().id(100L).name("Điện thoại").slug("dien-thoai").build();
        Brand brand = Brand.builder().id(200L).name("Apple").slug("apple").build();

        Product activeProduct = Product.builder()
                .id(1L)
                .shopId(10L)
                .name("iPhone 15 Pro")
                .slug("iphone-15-pro")
                .category(cat)
                .brandId(200L)
                .brand(brand)
                .status(ProductStatus.ACTIVE)
                .build();

        when(productRepository.findByShopIdAndStatusAndDeletedAtIsNull(eq(10L), eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activeProduct)));
        when(categoryRepository.findById(100L)).thenReturn(Optional.of(cat));
        when(brandRepository.findById(200L)).thenReturn(Optional.of(brand));

        ProductSummaryResponse summary = ProductSummaryResponse.builder()
                .id(1L)
                .name("iPhone 15 Pro")
                .shopId(10L)
                .build();
        PageResponse<ProductSummaryResponse> pageRes = PageResponse.<ProductSummaryResponse>builder()
                .content(List.of(summary))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .build();
        when(productService.getProducts(any(ProductFilterCriteria.class))).thenReturn(pageRes);

        ProductFilterCriteria criteria = ProductFilterCriteria.builder().build();
        PublicShopDetailResponse response = shopService.getPublicShopPage("10", criteria);

        assertNotNull(response);
        assertEquals(10L, response.getShop().getId());
        assertEquals("Cyber Flagship Store", response.getShop().getName());
        assertEquals(1L, response.getTotalActiveProducts());
        assertEquals(1, response.getAvailableCategories().size());
        assertEquals("Điện thoại", response.getAvailableCategories().get(0).getName());
        assertEquals(1, response.getAvailableBrands().size());
        assertEquals("Apple", response.getAvailableBrands().get(0).getName());
    }

    @Test
    @DisplayName("Lấy trang cửa hàng công khai theo slug URL")
    void testGetPublicShopPage_Success_BySlug() {
        when(shopRepository.findBySlug("cyber-flagship-store")).thenReturn(Optional.of(shop));
        when(productRepository.findByShopIdAndStatusAndDeletedAtIsNull(eq(10L), eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<ProductSummaryResponse> pageRes = PageResponse.<ProductSummaryResponse>builder()
                .content(List.of())
                .page(0)
                .size(12)
                .totalElements(0)
                .totalPages(0)
                .build();
        when(productService.getProducts(any(ProductFilterCriteria.class))).thenReturn(pageRes);

        PublicShopDetailResponse response = shopService.getPublicShopPage("cyber-flagship-store", null);

        assertNotNull(response);
        assertEquals(10L, response.getShop().getId());
        assertEquals("cyber-flagship-store", response.getShop().getSlug());
    }

    @Test
    @DisplayName("Cửa hàng bị tạm ngừng (SUSPENDED) -> Bị từ chối xem trang công khai 400 BadRequestException")
    void testGetPublicShopPage_BadRequest_WhenShopSuspended() {
        shop.setStatus(ShopStatus.SUSPENDED);
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                shopService.getPublicShopPage("10", null));

        assertTrue(ex.getMessage().contains("tạm ngừng hoạt động"));
    }
}
