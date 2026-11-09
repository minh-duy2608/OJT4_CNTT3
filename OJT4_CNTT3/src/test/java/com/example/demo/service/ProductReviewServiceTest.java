package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateProductReviewRequest;
import com.example.demo.dto.request.UpdateProductReviewRequest;
import com.example.demo.dto.response.ProductReviewResponse;
import com.example.demo.dto.response.ProductReviewSummaryResponse;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductReview;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductReviewRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.ProductReviewServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Product Review Service Unit Tests - Buyer Verification & Review Management")
class ProductReviewServiceTest extends BaseUnitTest {

    @Mock
    private ProductReviewRepository productReviewRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @InjectMocks
    private ProductReviewServiceImpl productReviewService;

    private User buyer;
    private User nonBuyer;
    private Product product;

    @BeforeEach
    void setUp() {
        buyer = User.builder()
                .id(1L)
                .username("buyeruser")
                .fullName("Buyer Nguyen")
                .role(Role.ROLE_USER)
                .build();

        nonBuyer = User.builder()
                .id(2L)
                .username("nonbuyer")
                .fullName("Guest User")
                .role(Role.ROLE_USER)
                .build();

        product = Product.builder()
                .id(100L)
                .name("iPhone 16 Pro Max")
                .shopId(10L)
                .build();
    }

    @Test
    @DisplayName("Khách hàng đã mua đơn DELIVERED thành công -> Được phép đánh giá sản phẩm")
    void testCreateReview_Success_WhenBuyer() {
        when(userRepository.findByUsernameOrEmail("buyeruser", "buyeruser")).thenReturn(Optional.of(buyer));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(productReviewRepository.existsByProductIdAndUserId(100L, 1L)).thenReturn(false);
        when(productReviewRepository.hasUserPurchasedProduct(1L, 100L)).thenReturn(true);
        when(productReviewRepository.save(any(ProductReview.class))).thenAnswer(inv -> {
            ProductReview r = inv.getArgument(0);
            r.setId(10L);
            return r;
        });

        CreateProductReviewRequest request = CreateProductReviewRequest.builder()
                .rating(5)
                .title("Quá tuyệt vời")
                .content("Máy rất mượt, pin trâu, giao hàng hỏa tốc.")
                .build();

        ProductReviewResponse response = productReviewService.createReview(100L, request, "buyeruser");

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals("Quá tuyệt vời", response.getTitle());
        assertTrue(response.getIsBuyer());
        verify(productReviewRepository).save(any(ProductReview.class));
    }

    @Test
    @DisplayName("Người dùng CHƯA TỪNG MUA sản phẩm cố tình đánh giá -> Bị chặn 400 BadRequestException")
    void testCreateReview_BadRequest_WhenNotBuyer() {
        when(userRepository.findByUsernameOrEmail("nonbuyer", "nonbuyer")).thenReturn(Optional.of(nonBuyer));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(productReviewRepository.existsByProductIdAndUserId(100L, 2L)).thenReturn(false);
        when(productReviewRepository.hasUserPurchasedProduct(2L, 100L)).thenReturn(false);

        CreateProductReviewRequest request = CreateProductReviewRequest.builder()
                .rating(5)
                .title("Đánh giá dạo")
                .content("Chưa mua nhưng thấy đẹp")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                productReviewService.createReview(100L, request, "nonbuyer"));

        assertTrue(ex.getMessage().contains("chỉ có thể đánh giá sản phẩm này sau khi đã mua hàng"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Khách hàng cố tình đánh giá trùng lặp lần 2 cho cùng 1 sản phẩm -> 409 ConflictException")
    void testCreateReview_Conflict_WhenAlreadyReviewed() {
        when(userRepository.findByUsernameOrEmail("buyeruser", "buyeruser")).thenReturn(Optional.of(buyer));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(productReviewRepository.existsByProductIdAndUserId(100L, 1L)).thenReturn(true);

        CreateProductReviewRequest request = CreateProductReviewRequest.builder()
                .rating(4)
                .content("Đánh giá lần 2")
                .build();

        ConflictException ex = assertThrows(ConflictException.class, () ->
                productReviewService.createReview(100L, request, "buyeruser"));

        assertTrue(ex.getMessage().contains("Mỗi khách hàng chỉ được viết 1 bài đánh giá"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("User không phải tác giả bài đánh giá cố tình chỉnh sửa -> 403 ForbiddenException")
    void testUpdateReview_Forbidden_WhenNotAuthor() {
        ProductReview review = ProductReview.builder()
                .id(10L)
                .product(product)
                .user(buyer) // Tác giả là buyer (ID 1L)
                .rating(5)
                .content("Rất tốt")
                .build();

        when(userRepository.findByUsernameOrEmail("nonbuyer", "nonbuyer")).thenReturn(Optional.of(nonBuyer));
        when(productReviewRepository.findById(10L)).thenReturn(Optional.of(review));

        UpdateProductReviewRequest updateReq = UpdateProductReviewRequest.builder()
                .rating(1)
                .content("Sửa phá bài người khác")
                .build();

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                productReviewService.updateReview(100L, 10L, updateReq, "nonbuyer"));

        assertTrue(ex.getMessage().contains("Bạn không có quyền chỉnh sửa"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lấy danh sách đánh giá sản phẩm: Hiển thị đúng trung bình sao, tổng lượt, phân loại rating và cờ canReview")
    void testGetProductReviews_Summary_Success() {
        ProductReview r1 = ProductReview.builder().id(1L).product(product).user(buyer).rating(5).content("Tốt").build();
        ProductReview r2 = ProductReview.builder().id(2L).product(product).user(nonBuyer).rating(4).content("Ổn").build();
        Pageable pageable = PageRequest.of(0, 10);

        when(productRepository.findById(100L)).thenReturn(Optional.of(product));
        when(userRepository.findByUsernameOrEmail("buyeruser", "buyeruser")).thenReturn(Optional.of(buyer));
        when(productReviewRepository.findByProductId(100L, pageable)).thenReturn(new PageImpl<>(List.of(r1, r2)));
        when(productReviewRepository.getAverageRatingByProductId(100L)).thenReturn(4.5);
        when(productReviewRepository.countByProductId(100L)).thenReturn(2L);
        when(productReviewRepository.hasUserPurchasedProduct(1L, 100L)).thenReturn(true);
        when(productReviewRepository.existsByProductIdAndUserId(100L, 1L)).thenReturn(true);

        ProductReviewSummaryResponse response = productReviewService.getProductReviews(100L, null, pageable, "buyeruser");

        assertNotNull(response);
        assertEquals(4.5, response.getAverageRating());
        assertEquals(2L, response.getTotalReviews());
        assertTrue(response.getHasPurchased());
        assertFalse(response.getCanReview()); // Đã mua nhưng đã review rồi nên canReview = false
    }
}

