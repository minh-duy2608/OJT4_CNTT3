package com.example.demo.service.impl;

import com.example.demo.dto.request.AddToWishlistRequest;
import com.example.demo.dto.response.WishlistItemResponse;
import com.example.demo.dto.response.WishlistResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.WishlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepository wishlistRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;

    @Override
    @Transactional
    public WishlistResponse getWishlist(String currentUsername) {
        User user = getUser(currentUsername);
        Wishlist wishlist = getOrCreateWishlist(user);
        return mapToWishlistResponse(wishlist);
    }

    @Override
    @Transactional
    public WishlistResponse addToWishlist(AddToWishlistRequest request, String currentUsername) {
        User user = getUser(currentUsername);
        Wishlist wishlist = getOrCreateWishlist(user);

        Long productId = request.getProductId();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm #" + productId));

        if (product.getStatus() != ProductStatus.ACTIVE || product.getDeletedAt() != null) {
            throw new BadRequestException("Sản phẩm đã ngừng kinh doanh hoặc không còn tồn tại");
        }

        boolean exists = wishlistItemRepository.existsByIdWishlistIdAndIdProductId(wishlist.getId(), productId);
        if (!exists) {
            WishlistItem item = WishlistItem.builder()
                    .id(WishlistItemId.builder()
                            .wishlistId(wishlist.getId())
                            .productId(productId)
                            .build())
                    .createdAt(LocalDateTime.now())
                    .build();
            wishlistItemRepository.save(item);
            log.info("User {} added product #{} to wishlist #{}", currentUsername, productId, wishlist.getId());
        }

        return getWishlist(currentUsername);
    }

    @Override
    @Transactional
    public WishlistResponse removeFromWishlist(Long productIdOrItemId, String currentUsername) {
        User user = getUser(currentUsername);
        Wishlist wishlist = getOrCreateWishlist(user);

        wishlistItemRepository.deleteByWishlistIdAndProductId(wishlist.getId(), productIdOrItemId);
        log.info("User {} removed product/item #{} from wishlist #{}", currentUsername, productIdOrItemId, wishlist.getId());

        return getWishlist(currentUsername);
    }

    @Override
    @Transactional
    public void clearWishlist(String currentUsername) {
        User user = getUser(currentUsername);
        Wishlist wishlist = getOrCreateWishlist(user);

        wishlistItemRepository.deleteByWishlistId(wishlist.getId());
        log.info("User {} cleared all items in wishlist #{}", currentUsername, wishlist.getId());
    }

    private User getUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));
    }

    private Wishlist getOrCreateWishlist(User user) {
        return wishlistRepository.findByUserId(user.getId())
                .orElseGet(() -> wishlistRepository.save(Wishlist.builder()
                        .userId(user.getId())
                        .name("Yêu thích")
                        .createdAt(LocalDateTime.now())
                        .build()));
    }

    private WishlistResponse mapToWishlistResponse(Wishlist wishlist) {
        List<WishlistItem> items = wishlistItemRepository.findByIdWishlistIdOrderByCreatedAtDesc(wishlist.getId());
        List<WishlistItemResponse> itemResponses = new ArrayList<>();

        for (WishlistItem wi : items) {
            Product product = productRepository.findById(wi.getId().getProductId()).orElse(null);
            if (product == null) continue;

            // Tính giá min/max
            List<ProductVariant> variants = productVariantRepository.findByProductIdAndStatus(product.getId(), ProductVariantStatus.ACTIVE);
            BigDecimal minP = null;
            BigDecimal maxP = null;
            for (ProductVariant v : variants) {
                BigDecimal eff = v.getSalePrice() != null ? v.getSalePrice() : v.getPrice();
                if (minP == null || (eff != null && eff.compareTo(minP) < 0)) minP = eff;
                if (maxP == null || (eff != null && eff.compareTo(maxP) > 0)) maxP = eff;
            }

            // Ảnh chính
            List<ProductImage> imgs = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(product.getId());
            String primaryImg = imgs.stream().filter(ProductImage::isPrimary).findFirst().map(ProductImage::getImageUrl)
                    .orElse(imgs.isEmpty() ? null : imgs.get(0).getImageUrl());

            Shop shop = product.getShopId() != null ? shopRepository.findById(product.getShopId()).orElse(null) : null;

            itemResponses.add(WishlistItemResponse.builder()
                    .productId(product.getId())
                    .name(product.getName())
                    .slug(product.getSlug())
                    .shortDescription(product.getShortDescription())
                    .minPrice(minP)
                    .maxPrice(maxP)
                    .imageUrl(primaryImg)
                    .shopId(product.getShopId())
                    .shopName(shop != null ? shop.getName() : null)
                    .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                    .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                    .brandId(product.getBrand() != null ? product.getBrand().getId() : null)
                    .brandName(product.getBrand() != null ? product.getBrand().getName() : null)
                    .inStock(product.getStatus() == ProductStatus.ACTIVE && !variants.isEmpty())
                    .addedAt(wi.getCreatedAt())
                    .build());
        }

        return WishlistResponse.builder()
                .id(wishlist.getId())
                .userId(wishlist.getUserId())
                .name(wishlist.getName())
                .items(itemResponses)
                .totalItems(itemResponses.size())
                .build();
    }
}
