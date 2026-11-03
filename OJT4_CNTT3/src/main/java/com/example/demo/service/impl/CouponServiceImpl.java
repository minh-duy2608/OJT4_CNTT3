package com.example.demo.service.impl;

import com.example.demo.dto.request.ValidateCouponItem;
import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.CouponService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {

    private final CouponRepository couponRepository;
    private final CouponProductRepository couponProductRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CouponResponse> getPublicShopCoupons(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        LocalDateTime now = LocalDateTime.now();
        List<Coupon> activeCoupons = couponRepository.findActivePublicCouponsByShopId(shopId, now);

        return activeCoupons.stream().map(c -> {
            long productRestrictions = couponProductRepository.countByIdCouponId(c.getId());
            return CouponResponse.fromEntity(c, shop.getName(), productRestrictions == 0);
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ValidateCouponResponse validateCoupon(ValidateCouponRequest request, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để kiểm tra mã giảm giá");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));

        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (code.isBlank()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .message("Mã giảm giá không được để trống")
                    .build();
        }

        // 1. Tìm coupon theo mã và shopId
        Optional<Coupon> couponOpt = request.getShopId() != null
                ? couponRepository.findByShopIdAndCode(request.getShopId(), code)
                : couponRepository.findByCode(code);

        if (couponOpt.isEmpty()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .message("Mã giảm giá \"" + code + "\" không tồn tại hoặc không áp dụng cho cửa hàng này")
                    .build();
        }

        Coupon coupon = couponOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // 2. Kiểm tra trạng thái và hạn sử dụng
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá hiện không hoạt động (" + coupon.getStatus() + ")")
                    .build();
        }

        if (now.isBefore(coupon.getStartAt())) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá chưa đến ngày áp dụng (bắt đầu từ " + coupon.getStartAt() + ")")
                    .build();
        }

        if (now.isAfter(coupon.getEndAt())) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đã hết hạn sử dụng")
                    .build();
        }

        // 3. Kiểm tra số lượng sử dụng toàn hệ thống
        if (coupon.getUsageLimit() != null && coupon.getUsageCount() >= coupon.getUsageLimit()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đã hết lượt sử dụng")
                    .build();
        }

        // 4. Kiểm tra giới hạn lượt dùng của từng người dùng
        if (coupon.getPerUserLimit() != null && coupon.getPerUserLimit() > 0) {
            long userUsages = couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), user.getId());
            if (userUsages >= coupon.getPerUserLimit()) {
                return ValidateCouponResponse.builder()
                        .valid(false)
                        .code(code)
                        .couponId(coupon.getId())
                        .message("Bạn đã sử dụng hết lượt cho mã giảm giá này (" + userUsages + "/" + coupon.getPerUserLimit() + " lượt)")
                        .build();
            }
        }

        // 5. Thu thập danh sách sản phẩm cần kiểm tra (từ request hoặc từ giỏ hàng hiện tại)
        List<ValidateCouponItem> itemsToValidate = request.getItems();
        if (itemsToValidate == null || itemsToValidate.isEmpty()) {
            // Lấy từ giỏ hàng hiện tại của user
            Optional<Cart> cartOpt = cartRepository.findByUserId(user.getId());
            if (cartOpt.isPresent()) {
                List<CartItem> cartItems = cartItemRepository.findByCartId(cartOpt.get().getId());
                itemsToValidate = new ArrayList<>();
                for (CartItem ci : cartItems) {
                    itemsToValidate.add(ValidateCouponItem.builder()
                            .variantId(ci.getVariantId())
                            .quantity(ci.getQuantity())
                            .build());
                }
            }
        }

        if (itemsToValidate == null || itemsToValidate.isEmpty()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Không có sản phẩm nào trong giỏ hàng hoặc đơn hàng dự kiến để áp dụng mã giảm giá")
                    .build();
        }

        // 6. Tính toán giá trị thực tế từ Database (tuyệt đối không tin tưởng giá từ Frontend)
        long productRestrictions = couponProductRepository.countByIdCouponId(coupon.getId());
        BigDecimal orderSubtotal = BigDecimal.ZERO;
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;

        for (ValidateCouponItem item : itemsToValidate) {
            ProductVariant variant = null;
            if (item.getVariantId() != null) {
                variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
            }

            if (variant == null && item.getProductId() != null) {
                List<ProductVariant> vars = productVariantRepository.findByProductIdAndStatus(item.getProductId(), ProductVariantStatus.ACTIVE);
                if (!vars.isEmpty()) variant = vars.get(0);
            }

            if (variant == null) continue;

            Product product = variant.getProduct();
            if (product == null || product.getStatus() != ProductStatus.ACTIVE || product.getDeletedAt() != null) {
                continue;
            }

            int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
            BigDecimal price = variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice();
            if (price == null) price = BigDecimal.ZERO;

            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty));
            orderSubtotal = orderSubtotal.add(lineTotal);

            // Kiểm tra xem sản phẩm có thuộc đúng shop của coupon không
            if (Objects.equals(product.getShopId(), coupon.getShopId())) {
                boolean isProductEligible = true;
                if (productRestrictions > 0) {
                    isProductEligible = couponProductRepository.existsByIdCouponIdAndIdProductId(coupon.getId(), product.getId());
                }
                if (isProductEligible) {
                    eligibleSubtotal = eligibleSubtotal.add(lineTotal);
                }
            }
        }

        if (eligibleSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá này không áp dụng cho bất kỳ sản phẩm nào trong đơn hàng của bạn")
                    .orderSubtotal(orderSubtotal)
                    .finalTotal(orderSubtotal)
                    .build();
        }

        // 7. Kiểm tra giá trị đơn hàng tối thiểu
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

        // 8. Tính toán số tiền được giảm
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
}

