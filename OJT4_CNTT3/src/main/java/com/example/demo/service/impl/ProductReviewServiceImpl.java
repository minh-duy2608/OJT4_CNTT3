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
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductReviewRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ProductReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private static final String NOT_FOUND_REVIEW_PREFIX = "Không tìm thấy đánh giá với id: ";
    private static final String REVIEW_NOT_BELONG_PRODUCT = "Đánh giá không thuộc sản phẩm này";

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ObjectMapper objectMapper;

    private String serializeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(imageUrls);
        } catch (Exception e) {
            log.warn("Lỗi serialize imageUrls review: {}", e.getMessage());
            return String.join(",", imageUrls);
        }
    }

    private record ReviewPermission(boolean hasPurchased, boolean canReview, boolean isShopOwnerOfProduct) {}

    private Map<Integer, Long> calculateRatingCounts(Long productId) {
        Map<Integer, Long> ratingCounts = new HashMap<>();
        for (int star = 1; star <= 5; star++) {
            ratingCounts.put(star, 0L);
        }
        List<Object[]> groupCounts = productReviewRepository.countReviewsGroupByRating(productId);
        if (groupCounts != null) {
            for (Object[] row : groupCounts) {
                if (row.length >= 2 && row[0] instanceof Integer star && row[1] instanceof Long cnt) {
                    ratingCounts.put(star, cnt);
                }
            }
        }
        return ratingCounts;
    }

    private ReviewPermission evaluateUserReviewPermission(User currentUser, Long productId, Long shopId) {
        if (currentUser == null) {
            return new ReviewPermission(false, false, false);
        }
        boolean hasPurchased = false;
        try {
            hasPurchased = productReviewRepository.hasUserPurchasedProduct(currentUser.getId(), productId);
        } catch (Exception e) {
            log.warn("Lỗi kiểm tra lịch sử mua hàng: {}", e.getMessage());
        }

        boolean hasReviewed = productReviewRepository.existsByProductIdAndUserId(productId, currentUser.getId());
        boolean canReview = hasPurchased && !hasReviewed;
        boolean isShopOwnerOfProduct = isUserShopOwner(currentUser, shopId);
        return new ReviewPermission(hasPurchased, canReview, isShopOwnerOfProduct);
    }

    private String resolveSellerShopName(Long shopId) {
        if (shopId != null) {
            return shopRepository.findById(shopId).map(Shop::getName).orElse("Cyber Official Store");
        }
        return "Cyber Official Store";
    }

    @Override
    @Transactional(readOnly = true)
    public ProductReviewSummaryResponse getProductReviews(Long productId, Integer ratingFilter, Pageable pageable, String currentUsername) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + productId));

        Long currentUserId = null;
        User currentUser = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            Optional<User> currentUserOpt = userRepository.findByUsernameOrEmail(currentUsername, currentUsername);
            if (currentUserOpt.isPresent()) {
                currentUser = currentUserOpt.get();
                currentUserId = currentUser.getId();
            }
        }

        // Lấy danh sách review theo trang và filter rating (nếu có)
        Page<ProductReview> reviewPage = (ratingFilter != null && ratingFilter >= 1 && ratingFilter <= 5)
                ? productReviewRepository.findByProductIdAndRating(productId, ratingFilter, pageable)
                : productReviewRepository.findByProductId(productId, pageable);

        Long finalCurrentUserId = currentUserId;
        List<ProductReviewResponse> reviewResponses = reviewPage.getContent().stream()
                .map(r -> ProductReviewResponse.fromEntity(r, finalCurrentUserId))
                .toList();

        // Thống kê tổng số đánh giá & sao trung bình
        Double rawAvg = productReviewRepository.getAverageRatingByProductId(productId);
        double averageRating = rawAvg != null ? Math.round(rawAvg * 10.0) / 10.0 : 0.0;
        long totalReviews = productReviewRepository.countByProductId(productId);

        Map<Integer, Long> ratingCounts = calculateRatingCounts(productId);
        ReviewPermission permission = evaluateUserReviewPermission(currentUser, productId, product.getShopId());
        String sellerShopName = resolveSellerShopName(product.getShopId());

        return ProductReviewSummaryResponse.builder()
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .ratingCounts(ratingCounts)
                .reviews(reviewResponses)
                .currentPage(reviewPage.getNumber() + 1)
                .totalPages(reviewPage.getTotalPages())
                .totalElements(reviewPage.getTotalElements())
                .hasPurchased(permission.hasPurchased())
                .canReview(permission.canReview())
                .isShopOwnerOfProduct(permission.isShopOwnerOfProduct())
                .sellerShopName(sellerShopName)
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

        // Ràng buộc 1: Mỗi người mua chỉ được viết 1 bài đánh giá cho 1 sản phẩm
        if (productReviewRepository.existsByProductIdAndUserId(productId, user.getId())) {
            throw new ConflictException("Bạn đã đánh giá sản phẩm này rồi. Mỗi khách hàng chỉ được viết 1 bài đánh giá cho mỗi sản phẩm.");
        }

        // Ràng buộc 2: CHỈ KHI NÀO KHÁCH HÀNG MUA HÀNG XONG MỚI ĐƯỢC ĐÁNH GIÁ
        boolean isBuyer = false;
        try {
            isBuyer = productReviewRepository.hasUserPurchasedProduct(user.getId(), productId);
        } catch (Exception e) {
            log.warn("Lỗi kiểm tra lịch sử mua hàng: {}", e.getMessage());
        }

        if (!isBuyer) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sản phẩm này sau khi đã mua hàng và đơn hàng được hoàn tất thành công.");
        }

        ProductReview review = ProductReview.builder()
                .product(product)
                .user(user)
                .rating(request.getRating())
                .title(request.getTitle() != null ? request.getTitle().trim() : null)
                .content(request.getContent().trim())
                .imageUrls(serializeImageUrls(request.getImageUrls()))
                .isBuyer(true)
                .build();

        ProductReview saved = productReviewRepository.save(review);
        log.info("User {} (Buyer) created review {} for product {}", user.getUsername(), saved.getId(), productId);

        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public ProductReviewResponse updateReview(Long productId, Long reviewId, UpdateProductReviewRequest request, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        if (!review.getProduct().getId().equals(productId)) {
            throw new ResourceNotFoundException(REVIEW_NOT_BELONG_PRODUCT);
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
        if (request.getImageUrls() != null) {
            review.setImageUrls(serializeImageUrls(request.getImageUrls()));
        }

        ProductReview saved = productReviewRepository.save(review);
        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public void deleteReview(Long productId, Long reviewId, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        if (!review.getProduct().getId().equals(productId)) {
            throw new ResourceNotFoundException(REVIEW_NOT_BELONG_PRODUCT);
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
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        Product product = review.getProduct();
        if (!product.getId().equals(productId)) {
            throw new ResourceNotFoundException(REVIEW_NOT_BELONG_PRODUCT);
        }

        // RÀNG BUỘC NGƯỜI BÁN: Khách mua của shop nào thì CHỈ CHỦ SHOP BÁN SẢN PHẨM ĐÓ mới được phản hồi đánh giá
        boolean isShopOwnerOfThisProduct = isUserShopOwner(user, product.getShopId());

        if (!isShopOwnerOfThisProduct) {
            throw new ForbiddenException("Chỉ chủ cửa hàng sở hữu và bán sản phẩm này mới có quyền phản hồi đánh giá của khách hàng.");
        }

        String shopName = "Cửa hàng chính thức";
        if (product.getShopId() != null) {
            Optional<Shop> shopOpt = shopRepository.findById(product.getShopId());
            if (shopOpt.isPresent()) {
                shopName = shopOpt.get().getName();
            }
        }

        review.setSellerReply(request.getReply().trim());
        review.setSellerReplyAt(LocalDateTime.now());
        review.setSellerReplierName(shopName);

        ProductReview saved = productReviewRepository.save(review);
        log.info("Review {} replied by Shop {} (User {}) for product {}", reviewId, shopName, user.getUsername(), productId);

        return ProductReviewResponse.fromEntity(saved, user.getId());
    }

    @Override
    @Transactional
    public ProductReviewResponse deleteReply(Long productId, Long reviewId, String currentUsername) {
        User user = getUserByUsername(currentUsername);
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_REVIEW_PREFIX + reviewId));

        Product product = review.getProduct();
        if (!product.getId().equals(productId)) {
            throw new ResourceNotFoundException(REVIEW_NOT_BELONG_PRODUCT);
        }

        boolean isShopOwnerOfThisProduct = isUserShopOwner(user, product.getShopId());

        if (!isShopOwnerOfThisProduct) {
            throw new ForbiddenException("Chỉ chủ cửa hàng bán sản phẩm này mới có quyền xóa phản hồi");
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
