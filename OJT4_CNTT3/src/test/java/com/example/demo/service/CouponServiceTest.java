package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.ValidateCouponItem;
import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.CouponServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Coupon Service Unit Tests - Storefront & Wallet")
class CouponServiceTest extends BaseUnitTest {

    @Mock private CouponRepository couponRepository;
    @Mock private CouponProductRepository couponProductRepository;
    @Mock private CouponUsageRepository couponUsageRepository;
    @Mock private ShopRepository shopRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private CartRepository cartRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserCouponRepository userCouponRepository;

    @InjectMocks
    private CouponServiceImpl couponService;

    private User mockUser;
    private Shop mockShop;
    private Coupon mockCoupon;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(1L)
                .username("testuser")
                .build();

        mockShop = Shop.builder()
                .id(10L)
                .name("Test Shop")
                .status(ShopStatus.ACTIVE)
                .build();

        mockCoupon = Coupon.builder()
                .id(100L)
                .shopId(10L)
                .code("SAVE20")
                .name("Giảm 20%")
                .discountType(CouponDiscountType.PERCENTAGE)
                .discountValue(BigDecimal.valueOf(20))
                .status(CouponStatus.ACTIVE)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .usageLimit(100)
                .usageCount(10)
                .perUserLimit(2)
                .build();
    }

    // ==================== saveCouponToWallet ====================

    @Test
    @DisplayName("T01 - Lưu coupon hợp lệ vào ví thành công (mới, chưa lưu trước đó)")
    void testSaveCouponToWallet_success_newSave() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(mockCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(userCouponRepository.findByUserIdAndCouponId(1L, 100L)).thenReturn(Optional.empty());
        when(couponUsageRepository.countAppliedUsagesByCouponAndUser(100L, 1L)).thenReturn(0L);
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);
        when(userCouponRepository.save(any(UserCoupon.class))).thenAnswer(inv -> inv.getArgument(0));

        CouponResponse result = couponService.saveCouponToWallet(100L, "testuser");

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertTrue(result.getIsSaved());
        assertTrue(result.getIsValid());
        assertNull(result.getInvalidReason());

        ArgumentCaptor<UserCoupon> captor = ArgumentCaptor.forClass(UserCoupon.class);
        verify(userCouponRepository).save(captor.capture());
        assertEquals(1L, captor.getValue().getUserId());
        assertEquals(100L, captor.getValue().getCouponId());
    }

    @Test
    @DisplayName("T02 - Idempotent: Lưu lại coupon đã lưu trước đó không lỗi, không tạo bản ghi mới")
    void testSaveCouponToWallet_idempotent_alreadySaved() {
        UserCoupon existingUC = UserCoupon.builder()
                .id(1L).userId(1L).couponId(100L)
                .savedAt(LocalDateTime.now().minusDays(2))
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(mockCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(userCouponRepository.findByUserIdAndCouponId(1L, 100L)).thenReturn(Optional.of(existingUC));
        when(couponUsageRepository.countAppliedUsagesByCouponAndUser(100L, 1L)).thenReturn(0L);
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);

        CouponResponse result = couponService.saveCouponToWallet(100L, "testuser");

        assertNotNull(result);
        assertTrue(result.getIsSaved());
        // Phải trả về savedAt của lần lưu cũ, không tạo bản ghi mới
        assertEquals(existingUC.getSavedAt(), result.getSavedAt());
        verify(userCouponRepository, never()).save(any(UserCoupon.class));
    }

    @Test
    @DisplayName("T03 - Lưu coupon khi chưa đăng nhập => UnauthorizedException")
    void testSaveCouponToWallet_notLoggedIn_throwsUnauthorized() {
        assertThrows(UnauthorizedException.class,
                () -> couponService.saveCouponToWallet(100L, null));
        assertThrows(UnauthorizedException.class,
                () -> couponService.saveCouponToWallet(100L, "   "));
        verify(userCouponRepository, never()).save(any());
    }

    @Test
    @DisplayName("T04 - Lưu coupon đã hết hạn => BadRequestException")
    void testSaveCouponToWallet_expiredCoupon_throwsBadRequest() {
        Coupon expiredCoupon = Coupon.builder()
                .id(100L).shopId(10L).code("EXP")
                .status(CouponStatus.ACTIVE)
                .startAt(LocalDateTime.now().minusDays(10))
                .endAt(LocalDateTime.now().minusDays(1))  // đã hết hạn
                .usageCount(0)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(expiredCoupon));
        // Shop check không được gọi khi coupon đã hết hạn
        lenient().when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> couponService.saveCouponToWallet(100L, "testuser"));
        assertTrue(ex.getMessage().contains("hết hạn") || ex.getMessage().contains("hạn"));
        verify(userCouponRepository, never()).save(any());
    }

    @Test
    @DisplayName("T05 - Lưu coupon chưa đến ngày bắt đầu => BadRequestException")
    void testSaveCouponToWallet_notStartedYet_throwsBadRequest() {
        Coupon notStarted = Coupon.builder()
                .id(100L).shopId(10L).code("FUTURE")
                .status(CouponStatus.ACTIVE)
                .startAt(LocalDateTime.now().plusDays(5))  // chưa đến ngày
                .endAt(LocalDateTime.now().plusDays(15))
                .usageCount(0)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(notStarted));
        // Shop check không được gọi khi coupon chưa đến ngày bắt đầu
        lenient().when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> couponService.saveCouponToWallet(100L, "testuser"));
        assertTrue(ex.getMessage().contains("chưa đến thời gian"));
        verify(userCouponRepository, never()).save(any());
    }

    @Test
    @DisplayName("T06 - Lưu coupon đã INACTIVE => BadRequestException")
    void testSaveCouponToWallet_inactiveCoupon_throwsBadRequest() {
        Coupon inactive = Coupon.builder()
                .id(100L).shopId(10L).code("OFF")
                .status(CouponStatus.INACTIVE)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .usageCount(0)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(inactive));
        // Shop check không được gọi khi coupon đã INACTIVE (validate thất bại sớm)
        lenient().when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> couponService.saveCouponToWallet(100L, "testuser"));
        assertTrue(ex.getMessage().contains("không hoạt động") || ex.getMessage().contains("vô hiệu"));
        verify(userCouponRepository, never()).save(any());
    }

    @Test
    @DisplayName("T07 - Lưu coupon đã hết lượt sử dụng => BadRequestException")
    void testSaveCouponToWallet_usageLimitReached_throwsBadRequest() {
        Coupon maxed = Coupon.builder()
                .id(100L).shopId(10L).code("FULL")
                .status(CouponStatus.ACTIVE)
                .startAt(LocalDateTime.now().minusDays(1))
                .endAt(LocalDateTime.now().plusDays(10))
                .usageLimit(50)
                .usageCount(50)  // đã hết lượt
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(maxed));
        // Shop check không được gọi khi coupon đã hết lượt
        lenient().when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> couponService.saveCouponToWallet(100L, "testuser"));
        assertTrue(ex.getMessage().contains("hết số lượt") || ex.getMessage().contains("hết lượt"));
        verify(userCouponRepository, never()).save(any());
    }

    @Test
    @DisplayName("T08 - Lưu coupon khi shop đang tạm ngừng => BadRequestException")
    void testSaveCouponToWallet_inactiveShop_throwsBadRequest() {
        Shop inactiveShop = Shop.builder()
                .id(10L).name("Shop Off").status(ShopStatus.SUSPENDED)
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(mockCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(inactiveShop));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> couponService.saveCouponToWallet(100L, "testuser"));
        assertTrue(ex.getMessage().contains("tạm ngừng"));
        verify(userCouponRepository, never()).save(any());
    }

    // ==================== getStorefrontCoupons ====================

    @Test
    @DisplayName("T09 - Storefront coupon list đánh dấu isSaved=true khi user đã lưu")
    void testGetStorefrontCoupons_marksSavedForLoggedInUser() {
        UserCoupon savedUC = UserCoupon.builder()
                .userId(1L).couponId(100L).savedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(couponRepository.findActiveStorefrontCoupons(isNull(), any(LocalDateTime.class)))
                .thenReturn(List.of(mockCoupon));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(userCouponRepository.findByUserIdAndCouponId(1L, 100L)).thenReturn(Optional.of(savedUC));
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);
        when(couponUsageRepository.countAppliedUsagesByCouponAndUser(100L, 1L)).thenReturn(0L);

        List<CouponResponse> results = couponService.getStorefrontCoupons(null, "testuser");

        assertEquals(1, results.size());
        assertTrue(results.get(0).getIsSaved());
        assertTrue(results.get(0).getIsValid());
    }

    @Test
    @DisplayName("T10 - Storefront coupon list không đánh dấu isSaved khi anonymous")
    void testGetStorefrontCoupons_notSaved_forAnonymousUser() {
        when(couponRepository.findActiveStorefrontCoupons(isNull(), any(LocalDateTime.class)))
                .thenReturn(List.of(mockCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);

        List<CouponResponse> results = couponService.getStorefrontCoupons(null, null);

        assertEquals(1, results.size());
        assertFalse(results.get(0).getIsSaved());
    }

    // ==================== getUserWalletCoupons ====================

    @Test
    @DisplayName("T11 - Ví voucher: trả về danh sách coupon đã lưu kèm trạng thái hiệu lực")
    void testGetUserWalletCoupons_returnsListWithValidityStatus() {
        UserCoupon uc = UserCoupon.builder()
                .id(1L).userId(1L).couponId(100L).savedAt(LocalDateTime.now().minusDays(2))
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(userCouponRepository.findByUserIdOrderBySavedAtDesc(1L)).thenReturn(List.of(uc));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(mockCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(couponUsageRepository.countAppliedUsagesByCouponAndUser(100L, 1L)).thenReturn(0L);
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);

        List<CouponResponse> results = couponService.getUserWalletCoupons("testuser");

        assertEquals(1, results.size());
        CouponResponse r = results.get(0);
        assertEquals(100L, r.getId());
        assertTrue(r.getIsSaved());
        assertTrue(r.getIsValid());
        assertNull(r.getInvalidReason());
    }

    @Test
    @DisplayName("T12 - Ví voucher: coupon hết hạn trong ví => isValid=false với lý do")
    void testGetUserWalletCoupons_expiredCouponInWallet_isValidFalse() {
        Coupon expiredCoupon = Coupon.builder()
                .id(100L).shopId(10L).code("EXP")
                .status(CouponStatus.ACTIVE)
                .startAt(LocalDateTime.now().minusDays(30))
                .endAt(LocalDateTime.now().minusDays(1))  // đã hết hạn
                .usageCount(0)
                .build();

        UserCoupon uc = UserCoupon.builder()
                .id(1L).userId(1L).couponId(100L).savedAt(LocalDateTime.now().minusDays(5))
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(userCouponRepository.findByUserIdOrderBySavedAtDesc(1L)).thenReturn(List.of(uc));
        when(couponRepository.findById(100L)).thenReturn(Optional.of(expiredCoupon));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(mockShop));
        when(couponUsageRepository.countAppliedUsagesByCouponAndUser(100L, 1L)).thenReturn(0L);
        when(couponProductRepository.countByIdCouponId(100L)).thenReturn(0L);

        List<CouponResponse> results = couponService.getUserWalletCoupons("testuser");

        assertEquals(1, results.size());
        CouponResponse r = results.get(0);
        assertFalse(r.getIsValid());
        assertNotNull(r.getInvalidReason());
        assertTrue(r.getInvalidReason().contains("hết hạn"));
    }

    @Test
    @DisplayName("T13 - Ví voucher khi chưa đăng nhập => UnauthorizedException")
    void testGetUserWalletCoupons_notLoggedIn_throwsUnauthorized() {
        assertThrows(UnauthorizedException.class,
                () -> couponService.getUserWalletCoupons(null));
    }

    // ==================== removeCouponFromWallet ====================

    @Test
    @DisplayName("T14 - Gỡ mã giảm giá khỏi ví cá nhân thành công")
    void testRemoveCouponFromWallet_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

        couponService.removeCouponFromWallet(100L, "testuser");

        verify(userCouponRepository).deleteByUserIdAndCouponId(1L, 100L);
    }

    // ==================== validateCoupon & Shop/Product Scope ====================

    @Test
    @DisplayName("T15 - Validate coupon với phạm vi sản phẩm (Product Scope) thành công khi sản phẩm nằm trong danh mục áp dụng")
    void testValidateCoupon_withProductScope_success() {
        CouponProduct cp = new CouponProduct(new CouponProductId(100L, 50L));
        ProductVariant variant = ProductVariant.builder()
                .id(10L)
                .price(BigDecimal.valueOf(500000))
                .product(Product.builder().id(50L).build())
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findByCode("SAVE20")).thenReturn(Optional.of(mockCoupon));
        when(couponProductRepository.findByIdCouponId(100L)).thenReturn(List.of(cp));
        when(productVariantRepository.findById(10L)).thenReturn(Optional.of(variant));

        ValidateCouponRequest request = ValidateCouponRequest.builder()
                .code("SAVE20")
                .items(List.of(ValidateCouponItem.builder().productId(50L).variantId(10L).quantity(1).build()))
                .build();

        ValidateCouponResponse response = couponService.validateCoupon(request, "testuser");

        assertNotNull(response);
        assertTrue(response.isValid());
        assertEquals("SAVE20", response.getCode());
        // 20% của 500,000 = 100,000
        assertEquals(new BigDecimal("100000.00"), response.getDiscountAmount());
    }

    @Test
    @DisplayName("T16 - Validate coupon thất bại khi sản phẩm mua KHÔNG THUỘC danh mục sản phẩm áp dụng của mã")
    void testValidateCoupon_withProductScope_ineligibleProduct() {
        // Coupon chỉ áp dụng cho product 50L
        CouponProduct cp = new CouponProduct(new CouponProductId(100L, 50L));
        // Nhưng giỏ hàng mua product 99L
        ProductVariant variant = ProductVariant.builder()
                .id(20L)
                .price(BigDecimal.valueOf(500000))
                .product(Product.builder().id(99L).build())
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findByCode("SAVE20")).thenReturn(Optional.of(mockCoupon));
        when(couponProductRepository.findByIdCouponId(100L)).thenReturn(List.of(cp));
        when(productVariantRepository.findById(20L)).thenReturn(Optional.of(variant));

        ValidateCouponRequest request = ValidateCouponRequest.builder()
                .code("SAVE20")
                .items(List.of(ValidateCouponItem.builder().productId(99L).variantId(20L).quantity(1).build()))
                .build();

        ValidateCouponResponse response = couponService.validateCoupon(request, "testuser");

        assertNotNull(response);
        assertFalse(response.isValid());
        assertTrue(response.getMessage().contains("không áp dụng cho bất kỳ sản phẩm nào"));
    }

    @Test
    @DisplayName("T17 - Validate coupon thất bại khi giá trị đơn hàng chưa đạt giá trị tối thiểu (minOrderAmount)")
    void testValidateCoupon_minOrderAmountNotMet() {
        mockCoupon.setMinOrderAmount(BigDecimal.valueOf(1000000)); // Đơn tối thiểu 1,000,000đ

        ProductVariant variant = ProductVariant.builder()
                .id(10L)
                .price(BigDecimal.valueOf(400000)) // Đơn mới 400,000đ
                .product(Product.builder().id(50L).build())
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(couponRepository.findByCode("SAVE20")).thenReturn(Optional.of(mockCoupon));
        when(couponProductRepository.findByIdCouponId(100L)).thenReturn(List.of()); // all products
        when(productVariantRepository.findById(10L)).thenReturn(Optional.of(variant));

        ValidateCouponRequest request = ValidateCouponRequest.builder()
                .code("SAVE20")
                .items(List.of(ValidateCouponItem.builder().productId(50L).variantId(10L).quantity(1).build()))
                .build();

        ValidateCouponResponse response = couponService.validateCoupon(request, "testuser");

        assertNotNull(response);
        assertFalse(response.isValid());
        assertTrue(response.getMessage().contains("chưa đạt giá trị tối thiểu"));
    }
}
