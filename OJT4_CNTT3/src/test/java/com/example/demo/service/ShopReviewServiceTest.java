package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateShopReviewRequest;
import com.example.demo.dto.request.ModerateShopReviewRequest;
import com.example.demo.dto.request.ReplyShopReviewRequest;
import com.example.demo.dto.request.UpdateShopReviewRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopReviewResponse;
import com.example.demo.dto.response.ShopReviewSummaryResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
import com.example.demo.service.NotificationService;
import com.example.demo.service.impl.ShopReviewServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Shop Review Service Unit Tests")
class ShopReviewServiceTest extends BaseUnitTest {

    @Mock
    private ShopReviewRepository shopReviewRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private ShopReviewServiceImpl shopReviewService;

    private User buyer;
    private User shopOwner;
    private User admin;
    private Shop shop;
    private Order order;
    private ShopReview review;

    @BeforeEach
    void setUp() {
        buyer = User.builder().id(1L).username("buyer").fullName("Buyer One").role(Role.ROLE_USER).build();
        shopOwner = User.builder().id(2L).username("owner").fullName("Shop Owner").role(Role.SHOP_MANAGER).build();
        admin = User.builder().id(3L).username("admin").role(Role.ADMIN).build();

        shop = Shop.builder().id(10L).name("Tech Shop").ownerId(2L).build();

        order = Order.builder()
                .id(100L)
                .orderCode("ORD-100")
                .shopId(10L)
                .userId(1L)
                .status(OrderStatus.DELIVERED)
                .build();

        review = ShopReview.builder()
                .id(50L)
                .orderId(100L)
                .shopId(10L)
                .userId(1L)
                .rating(5)
                .comment("Great shop")
                .status(ShopReviewStatus.PUBLISHED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getPublicShopReviews: returns paged published reviews")
    void getPublicShopReviews_success() {
        Page<ShopReview> page = new PageImpl<>(List.of(review));
        when(shopReviewRepository.findByShopIdAndStatusOrderByCreatedAtDesc(eq(10L), eq(ShopReviewStatus.PUBLISHED), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ShopReviewResponse> response = shopReviewService.getPublicShopReviews(10L, 0, 10);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals(5, response.getContent().get(0).getRating());
    }

    @Test
    @DisplayName("getShopReviewSummary: calculates average and star counts")
    void getShopReviewSummary_success() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopReviewRepository.countPublishedByShopId(10L)).thenReturn(10L);
        when(shopReviewRepository.getAverageRatingByShopId(10L)).thenReturn(4.8);
        when(shopReviewRepository.countByShopIdAndRating(eq(10L), anyInt())).thenReturn(2L);

        ShopReviewSummaryResponse res = shopReviewService.getShopReviewSummary(10L);

        assertNotNull(res);
        assertEquals(10L, res.getTotalReviews());
        assertEquals(4.8, res.getAverageRating());
    }

    @Test
    @DisplayName("createOrderReview: other user order throws ForbiddenException")
    void createOrderReview_forbidden() {
        User outsider = User.builder().id(99L).username("outsider").build();
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        CreateShopReviewRequest req = CreateShopReviewRequest.builder().rating(5).comment("Good").build();
        assertThrows(ForbiddenException.class, () -> shopReviewService.createOrderReview(100L, req, "outsider"));
    }

    @Test
    @DisplayName("createOrderReview: order not delivered throws BadRequestException")
    void createOrderReview_notDelivered() {
        order.setStatus(OrderStatus.CONFIRMED);
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        CreateShopReviewRequest req = CreateShopReviewRequest.builder().rating(5).comment("Good").build();
        assertThrows(BadRequestException.class, () -> shopReviewService.createOrderReview(100L, req, "buyer"));
    }

    @Test
    @DisplayName("createOrderReview: already reviewed throws BadRequestException")
    void createOrderReview_alreadyReviewed() {
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shopReviewRepository.existsByOrderId(100L)).thenReturn(true);

        CreateShopReviewRequest req = CreateShopReviewRequest.builder().rating(5).comment("Good").build();
        assertThrows(BadRequestException.class, () -> shopReviewService.createOrderReview(100L, req, "buyer"));
    }

    @Test
    @DisplayName("createOrderReview: success creates review and sends notification")
    void createOrderReview_success() {
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shopReviewRepository.existsByOrderId(100L)).thenReturn(false);
        when(shopReviewRepository.save(any(ShopReview.class))).thenReturn(review);
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        CreateShopReviewRequest req = CreateShopReviewRequest.builder()
                .rating(5)
                .comment("Great service")
                .imageUrls(List.of("https://example.com/img1.jpg"))
                .build();

        ShopReviewResponse res = shopReviewService.createOrderReview(100L, req, "buyer");

        assertNotNull(res);
        assertEquals(5, res.getRating());
        verify(notificationService).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("replyReview: outsider user throws ForbiddenException")
    void replyReview_forbidden() {
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 1L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        ReplyShopReviewRequest req = ReplyShopReviewRequest.builder().reply("Thank you").build();
        assertThrows(ForbiddenException.class, () -> shopReviewService.replyReview(10L, 50L, req, "buyer"));
    }

    @Test
    @DisplayName("replyReview: shop owner replies successfully")
    void replyReview_success() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopReviewRepository.findById(50L)).thenReturn(Optional.of(review));
        when(shopReviewRepository.save(any(ShopReview.class))).thenReturn(review);

        ReplyShopReviewRequest req = ReplyShopReviewRequest.builder().reply("Thank you very much!").build();
        ShopReviewResponse res = shopReviewService.replyReview(10L, 50L, req, "owner");

        assertNotNull(res);
        verify(notificationService).createNotification(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("moderateReview: admin moderates review successfully")
    void moderateReview_adminSuccess() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(shopReviewRepository.findById(50L)).thenReturn(Optional.of(review));
        when(shopReviewRepository.save(any(ShopReview.class))).thenReturn(review);

        ModerateShopReviewRequest req = ModerateShopReviewRequest.builder()
                .status(ShopReviewStatus.HIDDEN)
                .reason("Inappropriate content")
                .build();

        ShopReviewResponse res = shopReviewService.moderateReview(50L, req, "admin");

        assertNotNull(res);
        verify(auditLogService).log(any(), any(), any(), any(), any(), any());
    }
}

