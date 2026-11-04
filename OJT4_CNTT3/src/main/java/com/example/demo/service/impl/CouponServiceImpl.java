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
                .orElseThrow(() -> new UnauthorizedException("Người dùng không hợp lệ"));

        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (code.isBlank()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .message("Vui lòng nhập mã giảm giá")
                    .build();
        }

        // 1. Tìm Coupon theo Code
        Optional<Coupon> couponOpt = (request.getShopId() != null)
                ? couponRepository.findByShopIdAndCode(request.getShopId(), code)
                : couponRepository.findByCode(code);

        if (couponOpt.isEmpty()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .message("Mã giảm giá '" + code + "' không tồn tại hoặc không áp dụng cho cửa hàng này")
                    .build();
        }

        Coupon coupon = couponOpt.get();

        // 2. Kiểm tra trạng thái mã
        if (coupon.getStatus() != CouponStatus.ACTIVE) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đang không hoạt động (Trạng thái: " + coupon.getStatus() + ")")
                    .build();
        }

        // 3. Kiểm tra thời hạn hiệu lực
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(coupon.getStartAt())) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá chưa đến thời gian áp dụng (Bắt đầu từ: " + coupon.getStartAt() + ")")
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

        // 4. Kiểm tra tổng lượt sử dụng toàn hệ thống
        if (coupon.getUsageLimit() != null && coupon.getUsageCount() >= coupon.getUsageLimit()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(code)
                    .couponId(coupon.getId())
                    .message("Mã giảm giá đã hết lượt sử dụng")
                    .build();
        }

        // 5. Kiểm tra giới hạn lượt dùng của từng người dùng
        if (coupon.getPerUserLimit() != null) {
            long userUsedCount = couponUsageRepository.countAppliedUsagesByCouponAndUser(coupon.getId(), user.getId());
            if (userUsedCount >= coupon.getPerUserLimit()) {
                return ValidateCouponResponse.builder()
                        .valid(false)
                        .code(code)
                        .couponId(coupon.getId())
                        .message("Bạn đã dùng hết số lượt cho phép (" + coupon.getPerUserLimit() + " lượt) của mã giảm giá này")
                        .build();
            }
        }

        // 6. Tính toán giá trị đơn hàng hợp lệ dựa trên items gửi lên hoặc giỏ hàng
        List<ValidateCouponItem> items = request.getItems();
        BigDecimal orderSubtotal = BigDecimal.ZERO;
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;

        List<CouponProduct> restrictedProducts = couponProductRepository.findByIdCouponId(coupon.getId());
        boolean hasProductRestriction = !restrictedProducts.isEmpty();
        List<Long> eligibleProductIds = restrictedProducts.stream()
                .map(cp -> cp.getId().getProductId())
                .toList();

        if (items != null && !items.isEmpty()) {
            for (ValidateCouponItem item : items) {
                BigDecimal unitPrice = BigDecimal.ZERO;
                Long itemProductId = item.getProductId();

                if (item.getVariantId() != null) {
                    ProductVariant variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
                    if (variant != null) {
                        unitPrice = variant.getPrice();
                        if (itemProductId == null) {
                            itemProductId = variant.getProduct().getId();
                        }
                    }
                } else if (itemProductId != null) {
                    Product product = productRepository.findById(itemProductId).orElse(null);
                    if (product != null) {
                        unitPrice = product.getBasePrice();
                    }
                }

                int qty = (item.getQuantity() != null && item.getQuantity() > 0) ? item.getQuantity() : 1;
                BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
                orderSubtotal = orderSubtotal.add(lineTotal);

                boolean isProductEligible = true;
                if (hasProductRestriction) {
                    isProductEligible = itemProductId != null && eligibleProductIds.contains(itemProductId);
                }
                if (isProductEligible) {
                    eligibleSubtotal = eligibleSubtotal.add(lineTotal);
                }
            }
        } else {
            // Lấy từ giỏ hàng hiện tại của user
            Optional<Cart> cartOpt = cartRepository.findByUserId(user.getId());
            if (cartOpt.isPresent()) {
                List<CartItem> cartItems = cartItemRepository.findByCartId(cartOpt.get().getId());
                for (CartItem ci : cartItems) {
                    BigDecimal lineTotal = ci.getVariant().getPrice().multiply(BigDecimal.valueOf(ci.getQuantity()));
                    orderSubtotal = orderSubtotal.add(lineTotal);

                    Long itemProductId = ci.getVariant().getProduct().getId();
                    boolean isProductEligible = true;
                    if (hasProductRestriction) {
                        isProductEligible = eligibleProductIds.contains(itemProductId);
                    }
                    if (isProductEligible) {
                        eligibleSubtotal = eligibleSubtotal.add(lineTotal);
                    }
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
            Shop userShop = shopRepository.findFirstByOwnerIdOrderByIdDesc(user.getId())
                    .orElseThrow(() -> new ForbiddenException("Bạn chưa sở hữu cửa hàng nào để quản lý mã giảm giá"));
            effectiveShopId = userShop.getId();
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<Coupon> couponPage = couponRepository.searchCoupons(effectiveShopId, status, kw, pageable);

        List<CouponResponse> responseList = couponPage.getContent().stream().map(c -> {
            Shop shop = shopRepository.findById(c.getShopId()).orElse(null);
            String shopName = shop != null ? shop.getName() : ("Shop #" + c.getShopId());
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
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá #" + id));

        validateShopAccess(coupon.getShopId(), user);

        Shop shop = shopRepository.findById(coupon.getShopId()).orElse(null);
        String shopName = shop != null ? shop.getName() : ("Shop #" + coupon.getShopId());
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
            throw new BadRequestException("Mã giảm giá '" + code + "' đã tồn tại trong cửa hàng '" + shop.getName() + "'");
        }

        validateCouponRules(code, request.getDiscountType(), request.getDiscountValue(),
                request.getMaxDiscountAmount(), request.getMinOrderAmount(),
                request.getStartAt(), request.getEndAt(),
                request.getUsageLimit(), request.getPerUserLimit());

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

    @Override
    @Transactional
    public CouponResponse updateCoupon(Long id, UpdateCouponRequest request, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá #" + id));

        Shop shop = validateShopAccess(coupon.getShopId(), user);

        String code = request.getCode().trim().toUpperCase();
        if (couponRepository.existsByShopIdAndCodeAndIdNot(coupon.getShopId(), code, coupon.getId())) {
            throw new BadRequestException("Mã giảm giá '" + code + "' đã được sử dụng bởi chương trình khác trong shop này");
        }

        validateCouponRules(code, request.getDiscountType(), request.getDiscountValue(),
                request.getMaxDiscountAmount(), request.getMinOrderAmount(),
                request.getStartAt(), request.getEndAt(),
                request.getUsageLimit(), request.getPerUserLimit());

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

        // Cập nhật danh sách sản phẩm giới hạn nếu có
        List<Long> productIds = request.getProductIds();
        if (productIds != null) {
            List<CouponProduct> existing = couponProductRepository.findByIdCouponId(saved.getId());
            couponProductRepository.deleteAll(existing);

            if (!productIds.isEmpty()) {
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
        } else {
            List<CouponProduct> existing = couponProductRepository.findByIdCouponId(saved.getId());
            productIds = existing.stream().map(cp -> cp.getId().getProductId()).toList();
        }

        log.info("User {} updated coupon #{} ({})", user.getUsername(), saved.getId(), saved.getCode());
        return CouponResponse.fromEntity(saved, shop.getName(), productIds == null || productIds.isEmpty(), productIds);
    }

    @Override
    @Transactional
    public CouponResponse updateCouponStatus(Long id, CouponStatus status, String currentUsername) {
        User user = getCurrentUser(currentUsername);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá #" + id));

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
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mã giảm giá #" + id));

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

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private User getCurrentUser(String username) {
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để thực hiện thao tác");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không hợp lệ"));
    }

    private boolean isUserAdmin(User user) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream()
                .anyMatch(r -> "ROLE_ADMIN".equalsIgnoreCase(r.getName()) || "ADMIN".equalsIgnoreCase(r.getName()));
    }

    private Shop validateShopAccess(Long shopId, User user) {
        if (shopId == null) {
            throw new BadRequestException("ID cửa hàng không được để trống");
        }
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));
        boolean isAdmin = isUserAdmin(user);
        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("Bạn không có quyền quản lý mã giảm giá của cửa hàng này");
        }
        return shop;
    }

    private void validateCouponRules(String code, CouponDiscountType discountType, BigDecimal discountValue,
                                      BigDecimal maxDiscountAmount, BigDecimal minOrderAmount,
                                      LocalDateTime startAt, LocalDateTime endAt,
                                      Integer usageLimit, Integer perUserLimit) {
        if (code == null || code.trim().length() < 2) {
            throw new BadRequestException("Mã giảm giá phải có ít nhất 2 ký tự");
        }
        if (discountType == CouponDiscountType.PERCENTAGE) {
            if (discountValue == null || discountValue.compareTo(BigDecimal.ZERO) <= 0 || discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("Phần trăm giảm giá phải nằm trong khoảng từ 0.01% đến 100%");
            }
        } else if (discountType == CouponDiscountType.FIXED_AMOUNT) {
            if (discountValue == null || discountValue.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Số tiền giảm giá phải lớn hơn 0");
            }
        }
        if (startAt == null || endAt == null) {
            throw new BadRequestException("Thời gian bắt đầu và kết thúc không được để trống");
        }
        if (!endAt.isAfter(startAt)) {
            throw new BadRequestException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (minOrderAmount != null && minOrderAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Giá trị đơn hàng tối thiểu không được âm");
        }
        if (maxDiscountAmount != null && maxDiscountAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Số tiền giảm tối đa không được âm");
        }
        if (usageLimit != null && usageLimit <= 0) {
            throw new BadRequestException("Giới hạn lượt sử dụng phải lớn hơn 0");
        }
        if (perUserLimit != null && perUserLimit <= 0) {
            throw new BadRequestException("Giới hạn lượt dùng trên mỗi khách hàng phải lớn hơn 0");
        }
    }
}
