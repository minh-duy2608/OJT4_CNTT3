package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateProductReviewRequest;
import com.example.demo.dto.request.ReplyProductReviewRequest;
import com.example.demo.dto.request.UpdateProductReviewRequest;
import com.example.demo.dto.response.ProductReviewResponse;
import com.example.demo.dto.response.ProductReviewSummaryResponse;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductReview;
import com.example.demo.entity.Role;
import com.example.demo.entity.Shop;
import com.example.demo.entity.User;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductReviewRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ProductReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductReviewServiceImpl implements ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    @Override
    @Transactional(readOnly = true)
    public ProductReviewSummaryResponse getProductReviews(Long productId, Integer ratingFilter, Pageable pageable, String currentUsername) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId);
        }

        Long currentUserId = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            Optional<User> currentUserOpt = userRepository.findByUsernameOrEmail(currentUsername, currentUsername);
            if (currentUserOpt.isPresent()) {
                currentUserId = currentUserOpt.get().getId();
            }
        }

        // Lấy danh sách review theo trang và filter rating (nếu có)
        Page<ProductReview> reviewPage;
        if (ratingFilter != null && ratingFilter >= 1 && ratingFilter <= 5) {
            reviewPage = productReviewRepository.findByProductIdAndRating(productId, ratingFilter, pageable);
        } else {
            reviewPage = productReviewRepository.findByProductId(productId, pageable);
        }

        Long finalCurrentUserId = currentUserId;
        List<ProductReviewResponse> reviewResponses = reviewPage.getContent().stream()
                .map(r -> ProductReviewResponse.fromEntity(r, finalCurrentUserId))
                .collect(Collectors.toList());

        // Thống kê tổng số đánh giá & sao trung bình
        Double rawAvg = productReviewRepository.getAverageRatingByProductId(productId);
        double averageRating = rawAvg != null ? Math.round(rawAvg * 10.0) / 10.0 : 0.0;
        long totalReviews = productReviewRepository.countByProductId(productId);

        // Đếm số lượng từng mức sao 1..5
        Map<Integer, Long> ratingCounts = new HashMap<>();
        for (int star = 1; star <= 5; star++) {
            ratingCounts.put(star, 0L);
        }
        List<Object[]> groupCounts = productReviewRepository.countReviewsGroupByRating(productId);
        if (groupCounts != null) {
            for (Object[] row : groupCounts) {
                if (row.length >= 2 && row[0] instanceof Integer && row[1] instanceof Long) {
                    ratingCounts.put((Integer) row[0], (Long) row[1]);
                }
            }
        }

        return ProductReviewSummaryResponse.builder()
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .ratingCounts(ratingCounts)
                .reviews(reviewResponses)
                .currentPage(reviewPage.getNumber() + 1)
                .totalPages(reviewPage.getTotalPages())
                .totalElements(reviewPage.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductReviewResponse getMyReview(Long productId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            return null;
        }
        User user = getUserByUsername(currentUsername);
        return productReviewRepository.findByProductIdAndUserId(productId, user.getId())
                .map(r -> ProductReviewResponse.fromEntity(r, user.getId()))
                .orElse(null);
    }

    @Override
    @Transactional
    public ProductReviewResponse createReview(Long productId, CreateProductReviewRequest request, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId));

        // Kiểm tra mỗi người mua chỉ được viết 1 bài viết
        if (productReviewRepository.existsByProductIdAndUserId(productId, user.getId())) {
            throw new ConflictException("Bạn đã đánh giá sản phẩm này rồi. Mỗi khách hàng chỉ được viết 1 bài đánh giá cho mỗi sản phẩm.");
        }

        // Kiểm tra xem khách hàng đã từng mua sản phẩm này chưa
        boolean isBuyer = false;
        try {
            isBuyer = productReviewRepository.hasUserPurchasedProduct(user.getId(), productId);
        } catch (Exception e) {
            log.warn("Error checking purchased status: {}", e.getMessage());
        }

        ProductReview review = ProductReview.builder()
                .product(product)
                .user(user)
                .rating(request.getRating())
                .title(request.getTitle() != null ? request.getTitle().trim() : null)
                .content(request.getContent().trim())
                .isBuyer(isBuyer)
                .build();

        ProductReview saved = productReviewRepository.save(review);
        log.info("User {} created review {} for product {}", user.getUsername(), saved.getId(), productId);

        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public ProductReviewResponse updateReview(Long productId, Long reviewId, UpdateProductReviewRequest request, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));

        if (!review.getProduct().getId().equals(productId)) {
            throw new ResourceNotFoundException("Đánh giá không thuộc sản phẩm này");
        }

        // Chỉ chính chủ bài đánh giá mới được cập nhật
        if (!review.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Bạn không có quyền chỉnh sửa bài đánh giá này");
        }

        review.setRating(request.getRating());
        if (request.getTitle() != null) {
            review.setTitle(request.getTitle().trim());
        }
        review.setContent(request.getContent().trim());

        ProductReview saved = productReviewRepository.save(review);
        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public void deleteReview(Long productId, Long reviewId, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));

        if (!review.getProduct().getId().equals(productId)) {
            throw new ResourceNotFoundException("Đánh giá không thuộc sản phẩm này");
        }

        boolean isAdmin = isUserAdmin(user);
        boolean isOwner = review.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Bạn không có quyền xóa bài đánh giá này");
        }

        productReviewRepository.delete(review);
        log.info("Review {} deleted by user {}", reviewId, user.getUsername());
    }

    @Override
    @Transactional
    public ProductReviewResponse replyToReview(Long productId, Long reviewId, ReplyProductReviewRequest request, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));

        Product product = review.getProduct();
        if (!product.getId().equals(productId)) {
            throw new ResourceNotFoundException("Đánh giá không thuộc sản phẩm này");
        }

        // Kiểm tra quyền: Phải là Người bán (chủ shop sở hữu sản phẩm) hoặc Quản trị viên (ADMIN)
        boolean isAdmin = isUserAdmin(user);
        boolean isShopOwner = isUserShopOwner(user, product.getShopId());

        if (!isAdmin && !isShopOwner) {
            throw new ForbiddenException("Chỉ người bán của sản phẩm hoặc Quản trị viên mới có thể phản hồi đánh giá này");
        }

        String shopName = "Quản trị viên";
        if (product.getShopId() != null) {
            Optional<Shop> shopOpt = shopRepository.findById(product.getShopId());
            if (shopOpt.isPresent()) {
                shopName = shopOpt.get().getName();
            }
        }

        review.setSellerReply(request.getReply().trim());
        review.setSellerReplyAt(LocalDateTime.now());
        review.setSellerReplierName(shopName + " (Phản hồi chính thức)");

        ProductReview saved = productReviewRepository.save(review);
        log.info("Review {} replied by {} for product {}", reviewId, user.getUsername(), productId);

        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public ProductReviewResponse deleteReply(Long productId, Long reviewId, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với id: " + reviewId));

        Product product = review.getProduct();
        if (!product.getId().equals(productId)) {
            throw new ResourceNotFoundException("Đánh giá không thuộc sản phẩm này");
        }

        boolean isAdmin = isUserAdmin(user);
        boolean isShopOwner = isUserShopOwner(user, product.getShopId());

        if (!isAdmin && !isShopOwner) {
            throw new ForbiddenException("Bạn không có quyền xóa phản hồi này");
        }

        review.setSellerReply(null);
        review.setSellerReplyAt(null);
        review.setSellerReplierName(null);

        ProductReview saved = productReviewRepository.save(review);
        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    private User getUserByUsername(String username) {
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác này");
        }
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UnauthorizedException("Tài khoản người dùng không tồn tại"));
    }

    private boolean isUserAdmin(User user) {
        if (user == null) return false;
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN) {
            return true;
        }
        if (user.getRoles() != null) {
            return user.getRoles().stream().anyMatch(r -> 
                    "ADMIN".equalsIgnoreCase(r.getCode()) || 
                    "ROLE_ADMIN".equalsIgnoreCase(r.getCode())
            );
        }
        return false;
    }

    private boolean isUserShopOwner(User user, Long shopId) {
        if (user == null || shopId == null) return false;
        Optional<Shop> shopOpt = shopRepository.findById(shopId);
        if (shopOpt.isPresent()) {
            Shop shop = shopOpt.get();
            if (shop.getOwnerId() != null && shop.getOwnerId().equals(user.getId())) {
                return true;
            }
        }
        try {
            return shopRepository.countActiveMemberInShop(shopId, user.getId()) > 0;
        } catch (Exception e) {
            return false;
        }
    }
}
