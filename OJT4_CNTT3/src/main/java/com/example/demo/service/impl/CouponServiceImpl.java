package com.example.demo.service.impl;

import com.example.demo.dto.request.CreateCouponRequest;
import com.example.demo.dto.request.UpdateCouponRequest;
import com.example.demo.dto.request.ValidateCouponItem;
import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.CouponService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String NOT_FOUND_PRODUCT_PREFIX = "Không tìm thấy sản phẩm #";
    private static final String SHOP_PREFIX = "Shop #";
    private static final String COUPON_QUOTE_PREFIX = "Mã giảm giá '";
    private static final String PRODUCT_PREFIX = "Sản phẩm #";
    private static final String INVALID_USER_MSG = "Người dùng không hợp lệ";
    private static final String NOT_FOUND_COUPON_PREFIX = "Không tìm thấy mã giảm giá #";
    private static final String MAX_USAGE_PREFIX = "Bạn đã dùng hết số lượt cho phép (";

    private final CouponRepository couponRepository;
    private final CouponProductRepository couponProductRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final ShopRepository shopRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final UserCouponRepository userCouponRepository;

    private record CouponValidity(boolean isValid, String reason) {}
    private record SubtotalCalculation(BigDecimal orderSubtotal, BigDecimal eligibleSubtotal) {}
    private record CouponRuleDto(
            String code,
            CouponDiscountType discountType,
            BigDecimal discountValue,
            BigDecimal maxDiscountAmount,
            BigDecimal minOrderAmount,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Integer usageLimit,
            Integer perUserLimit
    ) {}

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getPublicShopCoupons(Long shopId) {
        return doGetPublicShopCoupons(shopId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getPublicShopCoupons(Long shopId, String currentUsername) {
        return doGetPublicShopCoupons(shopId, currentUsername);
    }

    private List<CouponResponse> doGetPublicShopCoupons(Long shopId, String currentUsername) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        List<Coupon> activeCoupons = couponRepository.findActivePublicCouponsByShopId(shopId, now);

        Long currentUserId = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            currentUserId = userRepository.findByUsername(currentUsername).map(User::getId).orElse(null);
        }

        Long finalUserId = currentUserId;
        return activeCoupons.stream().map(c -> mapToCouponResponseWithWallet(c, shop.getName(), finalUserId, now)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getProductCoupons(Long productId, String currentUsername) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_PRODUCT_PREFIX + productId));

        Long shopId = product.getShopId();
        if (shopId == null) {
            return List.of();
        }

        Shop shop = shopRepository.findById(shopId).orElse(null);
        String shopName = shop != null ? shop.getName() : (SHOP_PREFIX + shopId);

        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        List<Coupon> activeCoupons = couponRepository.findActivePublicCouponsByShopId(shopId, now);

        Long currentUserId = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            currentUserId = userRepository.findByUsername(currentUsername).map(User::getId).orElse(null);
        }

        Long finalUserId = currentUserId;
        return activeCoupons.stream()
                .filter(c -> {
                    long restrictionCount = couponProductRepository.countByIdCouponId(c.getId());
                    if (restrictionCount == 0) {
                        return true; // Mã áp dụng cho toàn bộ sản phẩm của cửa hàng này
                    }
                    return couponProductRepository.existsByIdCouponIdAndIdProductId(c.getId(), productId);
                })
                .map(c -> mapToCouponResponseWithWallet(c, shopName, finalUserId, now))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getStorefrontCoupons(Long shopId, String currentUsername) {
        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        List<Coupon> activeCoupons = couponRepository.findActiveStorefrontCoupons(shopId, now);

        Long currentUserId = null;
        if (currentUsername != null && !currentUsername.isBlank()) {
            currentUserId = userRepository.findByUsername(currentUsername).map(User::getId).orElse(null);
        }

        Long finalUserId = currentUserId;
        return activeCoupons.stream().map(c -> {
            String shopName = null;
            if (c.getShopId() != null) {
                shopName = shopRepository.findById(c.getShopId()).map(Shop::getName).orElse(null);
            }
            return mapToCouponResponseWithWallet(c, shopName, finalUserId, now);
        }).toList();
    }

    @Override
    @Transactional
    public CouponResponse saveCouponToWallet(Long couponId, String currentUsername) {
        return doSaveCouponToWallet(couponId, currentUsername);
    }

    @Override
    @Transactional
    public CouponResponse saveCouponCodeToWallet(String code, String currentUsername) {
        if (code == null || code.trim().isEmpty()) {
            throw new BadRequestException("Vui lòng nhập mã giảm giá");
        }
        Coupon coupon = couponRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá '" + code.trim().toUpperCase() + "'"));
        return doSaveCouponToWallet(coupon.getId(), currentUsername);
    }

    private CouponResponse doSaveCouponToWallet(Long couponId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Vui lòng đăng nhập để lưu mã giảm giá vào ví");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException(INVALID_USER_MSG));

        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + couponId));

        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        validateCouponForSaving(coupon, now);

        // Chống lưu trùng / Idempotency: nếu đã lưu thì trả về thông tin hiện tại, không lỗi và không tạo bản ghi mới
        Optional<UserCoupon> existing = userCouponRepository.findByUserIdAndCouponId(user.getId(), coupon.getId());
        LocalDateTime savedAt;
        if (existing.isPresent()) {
            log.info("Mã coupon #{} đã được lưu trong ví của user #{} trước đó (Idempotent call)", coupon.getId(), user.getId());
            savedAt = existing.get().getSavedAt();
        } else {
            UserCoupon userCoupon = UserCoupon.builder()
                    .userId(user.getId())
                    .couponId(coupon.getId())
                    .savedAt(now)
                    .build();
            userCouponRepository.save(userCoupon);
            savedAt = now;
            log.info("Lưu thành công coupon #{} vào ví của user #{}", coupon.getId(), user.getId());
        }

        String shopName = null;
        if (coupon.getShopId() != null) {
            shopName = shopRepository.findById(coupon.getShopId()).map(Shop::getName).orElse(null);
        }

        int userUsageCount = (int) couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), user.getId());
        boolean allProducts = couponProductRepository.countByIdCouponId(coupon.getId()) == 0;

        return CouponResponse.fromEntity(
                coupon,
                shopName,
                allProducts,
                null,
                true,
                savedAt,
                true,
                null,
                userUsageCount
        );
    }

    private CouponValidity determineCouponValidity(Coupon coupon, int userUsageCount, LocalDateTime now) {
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            return new CouponValidity(false, "Mã không hoạt động");
        }
        if (coupon.getStartAt() != null && now.isBefore(coupon.getStartAt())) {
            return new CouponValidity(false, "Chưa đến thời gian áp dụng");
        }
        if (coupon.getEndAt() != null && now.isAfter(coupon.getEndAt())) {
            return new CouponValidity(false, "Mã đã hết hạn sử dụng");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsageCount() != null && coupon.getUsageCount() >= coupon.getUsageLimit()) {
            return new CouponValidity(false, "Mã đã hết lượt sử dụng chung");
        }
        if (coupon.getPerUserLimit() != null && userUsageCount >= coupon.getPerUserLimit()) {
            return new CouponValidity(false, MAX_USAGE_PREFIX + coupon.getPerUserLimit() + " lần)");
        }
        return new CouponValidity(true, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getUserWalletCoupons(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Vui lòng đăng nhập để xem ví mã giảm giá");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException(INVALID_USER_MSG));

        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        List<UserCoupon> userCoupons = userCouponRepository.findByUserIdOrderBySavedAtDesc(user.getId());

        List<CouponResponse> responses = new ArrayList<>();
        for (UserCoupon uc : userCoupons) {
            Coupon coupon = couponRepository.findById(uc.getCouponId()).orElse(null);
            if (coupon == null) continue;

            String shopName = null;
            if (coupon.getShopId() != null) {
                shopName = shopRepository.findById(coupon.getShopId()).map(Shop::getName).orElse(null);
            }

            int userUsageCount = (int) couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), user.getId());
            boolean allProducts = couponProductRepository.countByIdCouponId(coupon.getId()) == 0;
            CouponValidity validity = determineCouponValidity(coupon, userUsageCount, now);

            responses.add(CouponResponse.fromEntity(
                    coupon,
                    shopName,
                    allProducts,
                    null,
                    true,
                    uc.getSavedAt(),
                    validity.isValid(),
                    validity.reason(),
                    userUsageCount
            ));
        }

        return responses;
    }

    @Override
    @Transactional
    public void removeCouponFromWallet(Long couponId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException(INVALID_USER_MSG));
        userCouponRepository.deleteByUserIdAndCouponId(user.getId(), couponId);
    }

    private void validateCouponForSaving(Coupon coupon, LocalDateTime now) {
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + coupon.getCode() + "' hiện không hoạt động hoặc đã bị vô hiệu hóa");
        }
        if (coupon.getStartAt() != null && now.isBefore(coupon.getStartAt())) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + coupon.getCode() + "' chưa đến thời gian áp dụng");
        }
        if (coupon.getEndAt() != null && now.isAfter(coupon.getEndAt())) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + coupon.getCode() + "' đã hết hạn sử dụng");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsageCount() != null && coupon.getUsageCount() >= coupon.getUsageLimit()) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + coupon.getCode() + "' đã hết số lượt sử dụng");
        }
        if (coupon.getShopId() != null) {
            Shop shop = shopRepository.findById(coupon.getShopId()).orElse(null);
            if (shop != null && shop.getStatus() != ShopStatus.ACTIVE) {
                throw new BadRequestException("Cửa hàng phát hành mã giảm giá hiện đang tạm ngừng hoạt động");
            }
        }
    }

    private CouponResponse mapToCouponResponseWithWallet(Coupon coupon, String shopName, Long currentUserId, LocalDateTime now) {
        List<CouponProduct> restrictions = couponProductRepository.findByIdCouponId(coupon.getId());
        boolean allProducts = restrictions.isEmpty();
        List<Long> productIds = restrictions.stream().map(cp -> cp.getId().getProductId()).toList();
        boolean isSaved = false;
        LocalDateTime savedAt = null;
        int userUsageCount = 0;

        if (currentUserId != null) {
            Optional<UserCoupon> ucOpt = userCouponRepository.findByUserIdAndCouponId(currentUserId, coupon.getId());
            if (ucOpt.isPresent()) {
                isSaved = true;
                savedAt = ucOpt.get().getSavedAt();
            }
            userUsageCount = (int) couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), currentUserId);
        }

        CouponValidity validity = determineCouponValidity(coupon, userUsageCount, now);

        return CouponResponse.fromEntity(
                coupon,
                shopName,
                allProducts,
                productIds,
                isSaved,
                savedAt,
                validity.isValid(),
                validity.reason(),
                userUsageCount
        );
    }

    private Optional<ValidateCouponResponse> validateCouponRestrictions(Coupon coupon, User user, String code) {
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            return Optional.of(ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đang không hoạt động (Trạng thái: " + coupon.getStatus() + ")")
                    .build());
        }

        LocalDateTime now = LocalDateTime.now(ZONE_VN);
        if (now.isBefore(coupon.getStartAt())) {
            return Optional.of(ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá chưa đến thời gian áp dụng (Bắt đầu từ: " + coupon.getStartAt() + ")")
                    .build());
        }
        if (now.isAfter(coupon.getEndAt())) {
            return Optional.of(ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đã hết hạn sử dụng")
                    .build());
        }

        if (coupon.getUsageLimit() != null && coupon.getUsageCount() >= coupon.getUsageLimit()) {
            return Optional.of(ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đã hết lượt sử dụng")
                    .build());
        }

        if (coupon.getPerUserLimit() != null) {
            long userUsedCount = couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), user.getId());
            if (userUsedCount >= coupon.getPerUserLimit()) {
                return Optional.of(ValidateCouponResponse.builder()
                        .valid(false)
                        .code(code)
                        .couponId(coupon.getId())
                        .message(MAX_USAGE_PREFIX + coupon.getPerUserLimit() + " lượt) của mã giảm giá này")
                        .build());
            }
        }
        return Optional.empty();
    }

    private BigDecimal resolveValidateItemUnitPrice(ValidateCouponItem item) {
        if (item.getVariantId() != null) {
            ProductVariant variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
            if (variant != null) {
                return variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
            }
        }
        if (item.getProductId() != null) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null) {
                return productVariantRepository.findByProductIdOrderByPriceAsc(item.getProductId()).stream()
                        .map(v -> v.getSalePrice() != null ? v.getSalePrice() : v.getPrice())
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(BigDecimal.ZERO);
            }
        }
        return BigDecimal.ZERO;
    }

    private Long resolveValidateItemProductId(ValidateCouponItem item) {
        if (item.getProductId() != null) {
            return item.getProductId();
        }
        if (item.getVariantId() != null) {
            return productVariantRepository.findById(item.getVariantId())
                    .map(ProductVariant::getProduct)
                    .map(Product::getId)
                    .orElse(null);
        }
        return null;
    }

    private SubtotalCalculation calculateSubtotalFromItems(List<ValidateCouponItem> items, Coupon coupon, boolean hasProductRestriction, List<Long> eligibleProductIds) {
        BigDecimal orderSubtotal = BigDecimal.ZERO;
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;

        for (ValidateCouponItem item : items) {
            BigDecimal unitPrice = resolveValidateItemUnitPrice(item);
            int qty = (item.getQuantity() != null && item.getQuantity() > 0) ? item.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            orderSubtotal = orderSubtotal.add(lineTotal);

            Long itemProductId = resolveValidateItemProductId(item);
            Product itemProduct = itemProductId != null ? productRepository.findById(itemProductId).orElse(null) : null;
            boolean belongsToShop = itemProduct != null && Objects.equals(itemProduct.getShopId(), coupon.getShopId());

            boolean isProductEligible = belongsToShop && (!hasProductRestriction || eligibleProductIds.contains(itemProductId));
            if (isProductEligible) {
                eligibleSubtotal = eligibleSubtotal.add(lineTotal);
            }
        }
        return new SubtotalCalculation(orderSubtotal, eligibleSubtotal);
    }

    private BigDecimal resolveCartItemUnitPrice(CartItem ci) {
        if (ci.getVariant() == null) {
            return BigDecimal.ZERO;
        }
        if (ci.getVariant().getSalePrice() != null) {
            return ci.getVariant().getSalePrice();
        }
        return ci.getVariant().getPrice() != null ? ci.getVariant().getPrice() : BigDecimal.ZERO;
    }

    private SubtotalCalculation calculateSubtotalFromCart(User user, Coupon coupon, boolean hasProductRestriction, List<Long> eligibleProductIds) {
        BigDecimal orderSubtotal = BigDecimal.ZERO;
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;

        Optional<Cart> cartOpt = cartRepository.findByUserId(user.getId());
        if (cartOpt.isPresent()) {
            List<CartItem> cartItems = cartItemRepository.findByCartId(cartOpt.get().getId());
            for (CartItem ci : cartItems) {
                BigDecimal unitPrice = resolveCartItemUnitPrice(ci);
                BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(ci.getQuantity()));
                orderSubtotal = orderSubtotal.add(lineTotal);

                Product prod = (ci.getVariant() != null && ci.getVariant().getProduct() != null)
                        ? ci.getVariant().getProduct()
                        : null;
                boolean belongsToShop = prod != null && Objects.equals(prod.getShopId(), coupon.getShopId());

                boolean isProductEligible = belongsToShop && (!hasProductRestriction || (prod != null && eligibleProductIds.contains(prod.getId())));
                if (isProductEligible) {
                    eligibleSubtotal = eligibleSubtotal.add(lineTotal);
                }
            }
        }
        return new SubtotalCalculation(orderSubtotal, eligibleSubtotal);
    }

    private BigDecimal calculateDiscountAmount(Coupon coupon, BigDecimal eligibleSubtotal) {
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (coupon.getDiscountType() == CouponDiscountType.PERCENTAGE) {
            discountAmount = eligibleSubtotal
                    .multiply(coupon.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            if (coupon.getMaxDiscountAmount() != null && discountAmount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
                discountAmount = coupon.getMaxDiscountAmount();
            }
        } else if (coupon.getDiscountType() == CouponDiscountType.FIXED_AMOUNT) {
            discountAmount = coupon.getDiscountValue();
            if (discountAmount.compareTo(eligibleSubtotal) > 0) {
                discountAmount = eligibleSubtotal;
            }
        }
        return discountAmount;
    }

    @Override
    @Transactional(readOnly = true)
    public ValidateCouponResponse validateCoupon(ValidateCouponRequest request, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để kiểm tra mã giảm giá");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException(INVALID_USER_MSG));

        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (code.isBlank()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .message("Vui lòng nhập mã giảm giá")
                    .build();
        }

        Optional<Coupon> couponOpt = (request.getShopId() != null)
                ? couponRepository.findByShopIdAndCode(request.getShopId(), code)
                : couponRepository.findByCode(code);

        if (couponOpt.isEmpty()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .message(COUPON_QUOTE_PREFIX + code + "' không tồn tại hoặc không áp dụng cho cửa hàng này")
                    .build();
        }

        Coupon coupon = couponOpt.get();
        Optional<ValidateCouponResponse> invalidCheck = validateCouponRestrictions(coupon, user, code);
        if (invalidCheck.isPresent()) {
            return invalidCheck.get();
        }

        List<CouponProduct> restrictedProducts = couponProductRepository.findByIdCouponId(coupon.getId());
        boolean hasProductRestriction = !restrictedProducts.isEmpty();
        List<Long> eligibleProductIds = restrictedProducts.stream()
                .map(cp -> cp.getId().getProductId())
                .toList();

        SubtotalCalculation subtotal = (request.getItems() != null && !request.getItems().isEmpty())
                ? calculateSubtotalFromItems(request.getItems(), coupon, hasProductRestriction, eligibleProductIds)
                : calculateSubtotalFromCart(user, coupon, hasProductRestriction, eligibleProductIds);

        BigDecimal orderSubtotal = subtotal.orderSubtotal();
        BigDecimal eligibleSubtotal = subtotal.eligibleSubtotal();

        if (eligibleSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
            Shop cShop = shopRepository.findById(coupon.getShopId()).orElse(null);
            String shopName = cShop != null ? cShop.getName() : (SHOP_PREFIX + coupon.getShopId());
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message(COUPON_QUOTE_PREFIX + code + "' của cửa hàng '" + shopName + "' không áp dụng cho sản phẩm nào trong đơn hàng của bạn (Sản phẩm thuộc cửa hàng khác hoặc không nằm trong danh sách ưu đãi)")
                    .orderSubtotal(orderSubtotal)
                    .finalTotal(orderSubtotal)
                    .build();
        }

        if (coupon.getMinOrderAmount() != null && eligibleSubtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Đơn hàng chưa đạt giá trị tối thiểu " + coupon.getMinOrderAmount() + "đ để sử dụng mã này")
                    .orderSubtotal(orderSubtotal)
                    .eligibleSubtotal(eligibleSubtotal)
                    .finalTotal(orderSubtotal)
                    .build();
        }

        BigDecimal discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
        BigDecimal finalTotal = orderSubtotal.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        return ValidateCouponResponse.builder()
                .valid(true)
                .message("Áp dụng mã giảm giá thành công!")
                .couponId(coupon.getId())
                .code(coupon.getCode())
                .name(coupon.getName())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .discountAmount(discountAmount)
                .eligibleSubtotal(eligibleSubtotal)
                .orderSubtotal(orderSubtotal)
                .finalTotal(finalTotal)
                .build();
    }

    // =========================================================================
    // QUẢN TRỊ MÃ GIẢM GIÁ (ADMIN / SHOP_MANAGER)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CouponResponse> getAdminCoupons(Long shopId, CouponStatus status, String keyword, int page, int size, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        boolean isAdmin = isUserAdmin(user);

        Long effectiveShopId = shopId;
        if (!isAdmin) {
            Optional<Shop> userShop = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId());
            if (userShop.isPresent()) {
                effectiveShopId = userShop.get().getId();
            }
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<Coupon> couponPage = couponRepository.searchCoupons(effectiveShopId, status, kw, pageable);

        List<CouponResponse> responseList = couponPage.getContent().stream().map(c -> {
            Shop shop = shopRepository.findById(c.getShopId()).orElse(null);
            String shopName = shop != null ? shop.getName() : (SHOP_PREFIX + c.getShopId());
            List<CouponProduct> restrictions = couponProductRepository.findByIdCouponId(c.getId());
            List<Long> productIds = restrictions.stream().map(cp -> cp.getId().getProductId()).toList();
            return CouponResponse.fromEntity(c, shopName, restrictions.isEmpty(), productIds);
        }).toList();

        return PageResponse.<CouponResponse>builder()
                .content(responseList)
                .page(couponPage.getNumber())
                .size(couponPage.getSize())
                .totalElements(couponPage.getTotalElements())
                .totalPages(couponPage.getTotalPages())
                .first(couponPage.isFirst())
                .last(couponPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CouponResponse getAdminCouponById(Long id, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + id));

        validateShopAccess(coupon.getShopId(), user);

        Shop shop = shopRepository.findById(coupon.getShopId()).orElse(null);
        String shopName = shop != null ? shop.getName() : (SHOP_PREFIX + coupon.getShopId());
        List<CouponProduct> restrictions = couponProductRepository.findByIdCouponId(coupon.getId());
        List<Long> productIds = restrictions.stream().map(cp -> cp.getId().getProductId()).toList();

        return CouponResponse.fromEntity(coupon, shopName, restrictions.isEmpty(), productIds);
    }

    @Override
    @Transactional
    public CouponResponse createCoupon(CreateCouponRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Shop shop = validateShopAccess(request.getShopId(), user);

        String code = request.getCode().trim().toUpperCase();
        if (couponRepository.existsByShopIdAndCode(shop.getId(), code)) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + code + "' đã tồn tại trong cửa hàng '" + shop.getName() + "'");
        }

        validateCouponRules(new CouponRuleDto(
                code, request.getDiscountType(), request.getDiscountValue(),
                request.getMaxDiscountAmount(), request.getMinOrderAmount(),
                request.getStartAt(), request.getEndAt(),
                request.getUsageLimit(), request.getPerUserLimit()
        ));

        Coupon coupon = Coupon.builder()
                .shopId(shop.getId())
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .minOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO)
                .usageLimit(request.getUsageLimit())
                .usageCount(0)
                .perUserLimit(request.getPerUserLimit())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .status(request.getStatus() != null ? request.getStatus() : CouponStatus.ACTIVE)
                .createdBy(user.getId())
                .build();

        Coupon saved = couponRepository.save(coupon);

        List<Long> productIds = request.getProductIds();
        if (productIds != null && !productIds.isEmpty()) {
            for (Long pid : productIds) {
                Product p = productRepository.findById(pid)
                        .orElseThrow(() -> new BadRequestException(NOT_FOUND_PRODUCT_PREFIX + pid));
                if (!Objects.equals(p.getShopId(), shop.getId())) {
                    throw new BadRequestException(PRODUCT_PREFIX + pid + " ('" + p.getName() + "') thuộc cửa hàng #" + p.getShopId() + ", không thể thêm vào mã giảm giá của cửa hàng '" + shop.getName() + "' (#" + shop.getId() + ")!");
                }
            }
            List<CouponProduct> productMappings = productIds.stream()
                    .map(pid -> CouponProduct.builder()
                            .id(CouponProductId.builder()
                                    .couponId(saved.getId())
                                    .productId(pid)
                                    .build())
                            .build())
                    .toList();
            couponProductRepository.saveAll(productMappings);
        }

        log.info("User {} created coupon {} for shop #{}", user.getUsername(), saved.getCode(), shop.getId());
        return CouponResponse.fromEntity(saved, shop.getName(), productIds == null || productIds.isEmpty(), productIds);
    }

    private List<Long> updateCouponProductMappings(Coupon coupon, List<Long> productIds, Shop shop) {
        if (productIds != null) {
            if (!productIds.isEmpty()) {
                for (Long pid : productIds) {
                    Product p = productRepository.findById(pid)
                            .orElseThrow(() -> new BadRequestException(NOT_FOUND_PRODUCT_PREFIX + pid));
                    if (!Objects.equals(p.getShopId(), shop.getId())) {
                        throw new BadRequestException(PRODUCT_PREFIX + pid + " không thuộc cửa hàng #" + shop.getId());
                    }
                }
            }
            List<CouponProduct> existing = couponProductRepository.findByIdCouponId(coupon.getId());
            couponProductRepository.deleteAll(existing);

            if (!productIds.isEmpty()) {
                List<CouponProduct> productMappings = productIds.stream()
                        .map(pid -> CouponProduct.builder()
                                .id(CouponProductId.builder()
                                        .couponId(coupon.getId())
                                        .productId(pid)
                                        .build())
                                .build())
                        .toList();
                couponProductRepository.saveAll(productMappings);
            }
            return productIds;
        }
        List<CouponProduct> existing = couponProductRepository.findByIdCouponId(coupon.getId());
        return existing.stream().map(cp -> cp.getId().getProductId()).toList();
    }

    @Override
    @Transactional
    public CouponResponse updateCoupon(Long id, UpdateCouponRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + id));

        Shop shop = validateShopAccess(coupon.getShopId(), user);

        String code = request.getCode().trim().toUpperCase();
        if (couponRepository.existsByShopIdAndCodeAndIdNot(coupon.getShopId(), code, coupon.getId())) {
            throw new BadRequestException(COUPON_QUOTE_PREFIX + code + "' đã được sử dụng bởi chương trình khác trong shop này");
        }

        validateCouponRules(new CouponRuleDto(
                code, request.getDiscountType(), request.getDiscountValue(),
                request.getMaxDiscountAmount(), request.getMinOrderAmount(),
                request.getStartAt(), request.getEndAt(),
                request.getUsageLimit(), request.getPerUserLimit()
        ));

        coupon.setCode(code);
        coupon.setName(request.getName().trim());
        coupon.setDescription(request.getDescription());
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        coupon.setMinOrderAmount(request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO);
        coupon.setUsageLimit(request.getUsageLimit());
        coupon.setPerUserLimit(request.getPerUserLimit());
        coupon.setStartAt(request.getStartAt());
        coupon.setEndAt(request.getEndAt());
        if (request.getStatus() != null) {
            coupon.setStatus(request.getStatus());
        }

        Coupon saved = couponRepository.save(coupon);
        List<Long> productIds = updateCouponProductMappings(saved, request.getProductIds(), shop);

        log.info("User {} updated coupon #{} ({})", user.getUsername(), saved.getId(), saved.getCode());
        return CouponResponse.fromEntity(saved, shop.getName(), productIds == null || productIds.isEmpty(), productIds);
    }

    @Override
    @Transactional
    public CouponResponse updateCouponStatus(Long id, CouponStatus status, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + id));

        Shop shop = validateShopAccess(coupon.getShopId(), user);

        CouponStatus oldStatus = coupon.getStatus();
        coupon.setStatus(status);
        Coupon saved = couponRepository.save(coupon);

        List<CouponProduct> restrictions = couponProductRepository.findByIdCouponId(saved.getId());
        List<Long> productIds = restrictions.stream().map(cp -> cp.getId().getProductId()).toList();

        log.info("User {} changed coupon #{} status from {} to {}", user.getUsername(), id, oldStatus, status);
        return CouponResponse.fromEntity(saved, shop.getName(), restrictions.isEmpty(), productIds);
    }

    @Override
    @Transactional
    public void deleteCoupon(Long id, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + id));

        validateShopAccess(coupon.getShopId(), user);

        // Nếu mã đã được sử dụng, chuyển trạng thái thành INACTIVE thay vì xóa cứng để bảo vệ toàn vẹn lịch sử đơn hàng
        if (coupon.getUsageCount() != null && coupon.getUsageCount() > 0) {
            coupon.setStatus(CouponStatus.INACTIVE);
            couponRepository.save(coupon);
            log.info("Coupon #{} has been used {} times; marked as INACTIVE instead of hard delete", id, coupon.getUsageCount());
        } else {
            List<CouponProduct> restrictions = couponProductRepository.findByIdCouponId(id);
            if (!restrictions.isEmpty()) {
                couponProductRepository.deleteAll(restrictions);
            }
            couponRepository.delete(coupon);
            log.info("User {} permanently deleted coupon #{}", user.getUsername(), id);
        }
    }

    @Override
    @Transactional
    public CouponResponse updateCouponProducts(Long shopId, Long couponId, List<Long> productIds, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_COUPON_PREFIX + couponId));

        if (!Objects.equals(coupon.getShopId(), shopId)) {
            throw new BadRequestException(NOT_FOUND_COUPON_PREFIX + couponId + " không thuộc cửa hàng #" + shopId);
        }

        Shop shop = validateShopAccess(coupon.getShopId(), user);

        List<Long> updatedProductIds = updateCouponProductMappings(coupon, productIds, shop);

        log.info("User {} updated products scope for coupon #{} in shop #{}", user.getUsername(), couponId, shopId);
        return CouponResponse.fromEntity(coupon, shop.getName(), updatedProductIds == null || updatedProductIds.isEmpty(), updatedProductIds);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private User getCurrentUser(String username) {
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để thực hiện thao tác");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException(INVALID_USER_MSG));
    }

    private boolean isUserAdmin(User user) {
        if (user == null) return false;
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ADMIN) return true;
        if (user.getRoles() != null) {
            return user.getRoles().stream()
                    .anyMatch(r -> "ROLE_ADMIN".equalsIgnoreCase(r.getCode()) || "ADMIN".equalsIgnoreCase(r.getCode()));
        }
        return false;
    }

    private Shop validateShopAccess(Long shopId, User user) {
        boolean isAdmin = isUserAdmin(user);
        if (shopId == null) {
            Optional<Shop> ownedShop = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId());
            if (ownedShop.isPresent()) {
                return ownedShop.get();
            }
            if (isAdmin) {
                List<Shop> allShops = shopRepository.findAll();
                if (!allShops.isEmpty()) {
                    return allShops.get(0);
                }
            }
            throw new BadRequestException("ID cửa hàng không được để trống");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        boolean isShopMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shop.getId(), user.getId(), ShopMemberStatus.ACTIVE);

        if (!isAdmin && !isOwner && !isShopMember) {
            Optional<Shop> ownedShop = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId());
            if (ownedShop.isPresent() && Objects.equals(ownedShop.get().getId(), shop.getId())) {
                return shop;
            }
            throw new ForbiddenException("Bạn không có quyền quản lý mã giảm giá của cửa hàng #" + shopId + ". Chỉ chủ cửa hàng ('" + shop.getName() + "') hoặc nhân viên được phân quyền mới có thể thao tác!");
        }
        return shop;
    }

    private void validateCouponRules(CouponRuleDto rules) {
        if (rules.code() == null || rules.code().trim().length() < 2) {
            throw new BadRequestException("Mã giảm giá phải có ít nhất 2 ký tự");
        }
        if (rules.discountType() == CouponDiscountType.PERCENTAGE &&
                (rules.discountValue() == null || rules.discountValue().compareTo(BigDecimal.ZERO) <= 0 || rules.discountValue().compareTo(BigDecimal.valueOf(100)) > 0)) {
            throw new BadRequestException("Phần trăm giảm giá phải nằm trong khoảng từ 0.01% đến 100%");
        } else if (rules.discountType() == CouponDiscountType.FIXED_AMOUNT &&
                (rules.discountValue() == null || rules.discountValue().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new BadRequestException("Số tiền giảm giá phải lớn hơn 0");
        }
        if (rules.startAt() == null || rules.endAt() == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }
        if (!rules.endAt().isAfter(rules.startAt())) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (rules.minOrderAmount() != null && rules.minOrderAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Giá trị đơn hàng tối thiểu không được âm");
        }
        if (rules.maxDiscountAmount() != null && rules.maxDiscountAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Số tiền giảm tối đa không được âm");
        }
        if (rules.usageLimit() != null && rules.usageLimit() <= 0) {
            throw new BadRequestException("Giới hạn lượt sử dụng phải lớn hơn 0");
        }
        if (rules.perUserLimit() != null && rules.perUserLimit() <= 0) {
            throw new BadRequestException("Giới hạn lượt dùng trên mỗi khách hàng phải lớn hơn 0");
        }
    }
}
