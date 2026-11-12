package com.example.demo.service.impl;

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
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
import com.example.demo.service.NotificationService;
import com.example.demo.service.ShopReviewService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShopReviewServiceImpl implements ShopReviewService {

    private static final String ENTITY_SHOP_REVIEW = "SHOP_REVIEW";
    private static final String NOT_FOUND_REVIEW_PREFIX = "Không tìm thấy đánh giá #";

    private final ShopReviewRepository shopReviewRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShopReviewResponse> getPublicShopReviews(Long shopId, int page, int size) {
        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        Pageable pageable = PageRequest.of(p, s);

        Page<ShopReview> reviewPage = shopReviewRepository.findByShopIdAndStatusOrderByCreatedAtDesc(
                shopId, ShopReviewStatus.PUBLISHED, pageable
        );

        return PageResponse.<ShopReviewResponse>builder()
                .content(reviewPage.getContent().stream().map(this::mapToResponse).toList())
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .last(reviewPage.isLast())
                .first(reviewPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ShopReviewSummaryResponse getShopReviewSummary(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        long total = shopReviewRepository.countPublishedByShopId(shopId);
        Double avg = shopReviewRepository.getAverageRatingByShopId(shopId);
        double roundedAvg = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;

        Map<Integer, Long> counts = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            counts.put(i, shopReviewRepository.countByShopIdAndRating(shopId, i));
        }

        return ShopReviewSummaryResponse.builder()
                .shopId(shop.getId())
                .shopName(shop.getName())
                .averageRating(roundedAvg)
                .totalReviews(total)
                .ratingCounts(counts)
                .build();
    }

    @Override
    @Transactional
    public ShopReviewResponse createOrderReview(Long orderId, CreateShopReviewRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng #" + orderId));

        // 1. Phải là chủ đơn hàng
        if (!Objects.equals(order.getUserId(), user.getId())) {
            throw new ForbiddenException("Bạn không thể đánh giá đơn hàng của người khác");
        }

        // 2. Đơn hàng phải đã giao thành công
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Chỉ có thể đánh giá cửa hàng khi đơn hàng đã được giao thành công (DELIVERED)");
        }

        // 3. Đơn hàng chưa từng được đánh giá
        if (shopReviewRepository.existsByOrderId(orderId)) {
            throw new BadRequestException("Đơn hàng này đã được đánh giá trước đó");
        }

        String imageUrlsJson = null;
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            try {
                imageUrlsJson = objectMapper.writeValueAsString(request.getImageUrls());
            } catch (Exception e) {
                imageUrlsJson = String.join(",", request.getImageUrls());
            }
        }

        ShopReview review = ShopReview.builder()
                .orderId(orderId)
                .shopId(order.getShopId())
                .userId(user.getId())
                .rating(request.getRating())
                .comment(request.getComment())
                .imageUrls(imageUrlsJson)
                .status(ShopReviewStatus.PUBLISHED)
                .build();

        ShopReview saved = shopReviewRepository.save(review);

        // Gửi thông báo cho chủ shop
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop != null && shop.getOwnerId() != null) {
            notificationService.createNotification(
                    shop.getOwnerId(),
                    "SHOP_REVIEW_NEW",
                    "Đánh giá mới từ khách hàng",
                    "Đơn hàng #" + order.getOrderCode() + " vừa nhận được đánh giá " + request.getRating() + " sao từ khách hàng " + user.getFullName(),
                    ENTITY_SHOP_REVIEW,
                    saved.getId()
            );
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ShopReviewResponse getOrderReview(Long orderId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        ShopReview review = shopReviewRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn hàng #" + orderId + " chưa có đánh giá"));

        boolean isBuyer = Objects.equals(review.getUserId(), user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        boolean isShopManager = isUserShopManager(user, review.getShopId());

        if (!isBuyer && !isAdmin && !isShopManager) {
            throw new ForbiddenException("Bạn không có quyền xem chi tiết đánh giá này");
        }

        return mapToResponse(review);
    }

    @Override
    @Transactional
    public ShopReviewResponse updateReview(Long reviewId, UpdateShopReviewRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        ShopReview review = shopReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        if (!Objects.equals(review.getUserId(), user.getId())) {
            throw new ForbiddenException("Bạn chỉ có thể chỉnh sửa đánh giá của chính mình");
        }

        if (request.getRating() != null) {
            review.setRating(request.getRating());
        }
        if (request.getComment() != null) {
            review.setComment(request.getComment());
        }
        if (request.getImageUrls() != null) {
            try {
                review.setImageUrls(objectMapper.writeValueAsString(request.getImageUrls()));
            } catch (Exception e) {
                review.setImageUrls(String.join(",", request.getImageUrls()));
            }
        }

        ShopReview saved = shopReviewRepository.save(review);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        ShopReview review = shopReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        boolean isOwner = Objects.equals(review.getUserId(), user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền xóa đánh giá này");
        }

        shopReviewRepository.delete(review);
    }

    @Override
    @Transactional
    public ShopReviewResponse replyReview(Long shopId, Long reviewId, ReplyShopReviewRequest request, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        ShopReview review = shopReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        if (!Objects.equals(review.getShopId(), shopId)) {
            throw new BadRequestException("Đánh giá #" + reviewId + " không thuộc quyền quản lý của cửa hàng #" + shopId);
        }

        review.setShopReply(request.getReply());
        review.setRepliedAt(LocalDateTime.now());
        ShopReview saved = shopReviewRepository.save(review);

        // Thông báo cho khách hàng
        notificationService.createNotification(
                review.getUserId(),
                "SHOP_REVIEW_REPLY",
                "Cửa hàng đã phản hồi đánh giá của bạn",
                "Cửa hàng đã gửi lời phản hồi cho đánh giá đơn hàng #" + review.getOrderId(),
                ENTITY_SHOP_REVIEW,
                saved.getId()
        );

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ShopReviewResponse updateReply(Long shopId, Long reviewId, ReplyShopReviewRequest request, String currentUsername) {
        return replyReview(shopId, reviewId, request, currentUsername);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShopReviewResponse> getShopManageReviews(Long shopId, int page, int size, String currentUsername) {
        verifyShopPermission(shopId, currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<ShopReview> reviewPage = shopReviewRepository.findByShopIdOrderByCreatedAtDesc(shopId, pageable);

        return PageResponse.<ShopReviewResponse>builder()
                .content(reviewPage.getContent().stream().map(this::mapToResponse).toList())
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .last(reviewPage.isLast())
                .first(reviewPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ShopReviewResponse> getAdminReviews(Long shopId, ShopReviewStatus status, int page, int size, String currentUsername) {
        verifyAdminAccess(currentUsername);
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<ShopReview> reviewPage = shopReviewRepository.findAllByFilter(shopId, status, pageable);

        return PageResponse.<ShopReviewResponse>builder()
                .content(reviewPage.getContent().stream().map(this::mapToResponse).toList())
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .last(reviewPage.isLast())
                .first(reviewPage.isFirst())
                .build();
    }

    @Override
    @Transactional
    public ShopReviewResponse moderateReview(Long reviewId, ModerateShopReviewRequest request, String currentUsername) {
        User admin = verifyAdminAccess(currentUsername);
        ShopReview review = shopReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        review.setStatus(request.getStatus());
        review.setModeratedBy(admin.getId());
        review.setModeratedAt(LocalDateTime.now());
        review.setModerationReason(request.getReason());

        ShopReview saved = shopReviewRepository.save(review);

        auditLogService.log(admin.getId(), "MODERATE_SHOP_REVIEW", ENTITY_SHOP_REVIEW, String.valueOf(reviewId), review.getShopId(),
                "Kiểm duyệt đánh giá sang trạng thái " + request.getStatus() + (request.getReason() != null ? " (" + request.getReason() + ")" : ""));

        return mapToResponse(saved);
    }

    private User getCurrentUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));
    }

    private User verifyShopPermission(Long shopId, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isShopManager = isUserShopManager(user, shopId);
        if (!isShopManager) {
            throw new ForbiddenException("Chỉ chủ cửa hàng của đơn hàng này mới có quyền phản hồi đánh giá của khách hàng.");
        }
        return user;
    }

    private boolean isUserShopManager(User user, Long shopId) {
        if (user == null || shopId == null) return false;
        boolean isOwner = shopRepository.findById(shopId)
                .map(s -> Objects.equals(s.getOwnerId(), user.getId()))
                .orElse(false);
        if (isOwner) return true;
        return shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
    }

    private User verifyAdminAccess(String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        if (!isAdmin) {
            throw new ForbiddenException("Chỉ Quản trị viên hệ thống mới có quyền kiểm duyệt đánh giá");
        }
        return user;
    }

    private List<String> parseReviewImageUrls(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyList();
        }
        try {
            if (raw.trim().startsWith("[")) {
                return objectMapper.readValue(raw, new TypeReference<List<String>>() {});
            } else {
                return Arrays.stream(raw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
            }
        } catch (Exception e) {
            return List.of(raw);
        }
    }

    private ShopReviewResponse mapToResponse(ShopReview r) {
        String username = null;
        String userFullName = null;
        String userAvatarUrl = null;
        if (r.getUser() != null) {
            username = r.getUser().getUsername();
            userFullName = r.getUser().getFullName();
            userAvatarUrl = r.getUser().getAvatarUrl();
        } else if (r.getUserId() != null) {
            User u = userRepository.findById(r.getUserId()).orElse(null);
            if (u != null) {
                username = u.getUsername();
                userFullName = u.getFullName();
                userAvatarUrl = u.getAvatarUrl();
            }
        }

        String shopName = null;
        if (r.getShop() != null) {
            shopName = r.getShop().getName();
        } else if (r.getShopId() != null) {
            shopName = shopRepository.findById(r.getShopId()).map(Shop::getName).orElse(null);
        }

        String orderCode = null;
        if (r.getOrder() != null) {
            orderCode = r.getOrder().getOrderCode();
        } else if (r.getOrderId() != null) {
            orderCode = orderRepository.findById(r.getOrderId()).map(Order::getOrderCode).orElse(null);
        }

        List<String> imageUrls = parseReviewImageUrls(r.getImageUrls());

        return ShopReviewResponse.builder()
                .id(r.getId())
                .orderId(r.getOrderId())
                .orderCode(orderCode)
                .shopId(r.getShopId())
                .shopName(shopName)
                .userId(r.getUserId())
                .username(username)
                .userFullName(userFullName)
                .userAvatarUrl(userAvatarUrl)
                .rating(r.getRating())
                .comment(r.getComment())
                .imageUrls(imageUrls)
                .status(r.getStatus())
                .shopReply(r.getShopReply())
                .repliedAt(r.getRepliedAt())
                .moderatedBy(r.getModeratedBy())
                .moderatedAt(r.getModeratedAt())
                .moderationReason(r.getModerationReason())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}

