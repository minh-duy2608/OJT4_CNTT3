package com.example.demo.service.impl;

import com.example.demo.dto.request.AddToCartRequest;
import com.example.demo.dto.response.CartItemResponse;
import com.example.demo.dto.response.CartResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.CartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopRepository shopRepository;

    @Override
    @Transactional
    public CartResponse getCart(String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);
        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse addToCart(AddToCartRequest request, String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);

        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể #" + request.getVariantId()));

        Product product = variant.getProduct();
        if (product == null || product.getStatus() != ProductStatus.ACTIVE || product.getDeletedAt() != null) {
            throw new BadRequestException("Sản phẩm đã ngừng kinh doanh hoặc không còn tồn tại");
        }
        if (variant.getStatus() != ProductVariantStatus.ACTIVE) {
            throw new BadRequestException("Phiên bản sản phẩm đã ngừng kinh doanh");
        }

        // Kiểm tra trạng thái hoạt động của Cửa hàng
        if (product.getShopId() != null) {
            Shop shop = shopRepository.findById(product.getShopId()).orElse(null);
            if (shop != null && shop.getStatus() != ShopStatus.ACTIVE) {
                throw new BadRequestException("Cửa hàng '" + shop.getName() + "' hiện đang tạm ngừng hoạt động (" + shop.getStatus() + ")");
            }
        }

        int addQty = request.getQuantity() != null && request.getQuantity() > 0 ? request.getQuantity() : 1;

        // Kiểm tra tồn kho khả dụng
        Inventory inventory = inventoryRepository.findById(variant.getId()).orElse(null);
        int availableStock = inventory != null ? inventory.getAvailableQuantity() : 0;

        if (availableStock <= 0) {
            throw new BadRequestException("Sản phẩm '" + product.getName() + " (" + variant.getVariantName() + ")' hiện đã hết hàng");
        }

        Optional<CartItem> existingOpt = cartItemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId());
        int currentInCart = existingOpt.map(CartItem::getQuantity).orElse(0);

        if (currentInCart + addQty > availableStock) {
            throw new BadRequestException("Số lượng tồn kho không đủ (chỉ còn " + availableStock + " sản phẩm khả dụng)");
        }

        if (existingOpt.isPresent()) {
            CartItem item = existingOpt.get();
            item.setQuantity(item.getQuantity() + addQty);
            cartItemRepository.save(item);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .variantId(variant.getId())
                    .quantity(addQty)
                    .build();
            cartItemRepository.save(newItem);
        }

        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse updateItemQuantity(Long itemId, int quantity, String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng #" + itemId));

        if (!Objects.equals(item.getCart().getId(), cart.getId())) {
            throw new BadRequestException("Sản phẩm không thuộc giỏ hàng của bạn");
        }

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            Inventory inventory = inventoryRepository.findById(item.getVariantId()).orElse(null);
            int availableStock = inventory != null ? inventory.getAvailableQuantity() : 0;
            if (availableStock <= 0) {
                throw new BadRequestException("Sản phẩm này hiện đã hết hàng trong kho. Không thể tăng số lượng!");
            }
            if (quantity > availableStock) {
                throw new BadRequestException("Số lượng vượt quá tồn kho khả dụng (chỉ còn " + availableStock + " sản phẩm)");
            }
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse removeItem(Long itemId, String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm trong giỏ hàng #" + itemId));

        if (!Objects.equals(item.getCart().getId(), cart.getId())) {
            throw new BadRequestException("Sản phẩm không thuộc giỏ hàng của bạn");
        }

        cartItemRepository.delete(item);
        return mapToCartResponse(cart);
    }

    @Override
    @Transactional
    public void clearCart(String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);
        cartItemRepository.deleteByCartId(cart.getId());
    }

    @Override
    @Transactional
    public CartResponse syncCart(List<AddToCartRequest> items, String currentUsername) {
        User user = getUser(currentUsername);
        Cart cart = getOrCreateCart(user);

        if (items != null) {
            for (AddToCartRequest req : items) {
                if (req.getVariantId() != null) {
                    ProductVariant variant = productVariantRepository.findById(req.getVariantId()).orElse(null);
                    if (variant != null) {
                        syncSingleItem(cart, req, variant);
                    }
                }
            }
        }

        return mapToCartResponse(cart);
    }

    private void syncSingleItem(Cart cart, AddToCartRequest req, ProductVariant variant) {
        Inventory inventory = inventoryRepository.findById(variant.getId()).orElse(null);
        int availableStock = inventory != null ? inventory.getAvailableQuantity() : 0;
        if (availableStock <= 0) {
            return;
        }

        int qty = req.getQuantity() != null && req.getQuantity() > 0 ? req.getQuantity() : 1;
        qty = Math.min(qty, availableStock);
        Optional<CartItem> existing = cartItemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId());
        if (existing.isPresent()) {
            CartItem ci = existing.get();
            ci.setQuantity(Math.max(ci.getQuantity(), qty));
            cartItemRepository.save(ci);
        } else {
            cartItemRepository.save(CartItem.builder()
                    .cart(cart)
                    .variantId(variant.getId())
                    .quantity(qty)
                    .build());
        }
    }

    private User getUser(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + currentUsername));
    }

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(Cart.builder().userId(user.getId()).build()));
    }

    private BigDecimal resolveEffectivePrice(ProductVariant variant) {
        if (variant.getSalePrice() != null) {
            return variant.getSalePrice();
        }
        return variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
    }

    private String resolveProductImageUrl(Product product) {
        if (product == null) {
            return null;
        }
        List<ProductImage> imgs = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(product.getId());
        return imgs.stream()
                .filter(ProductImage::isPrimary)
                .findFirst()
                .map(ProductImage::getImageUrl)
                .orElse(imgs.isEmpty() ? null : imgs.get(0).getImageUrl());
    }

    private CartItemResponse buildCartItemResponse(CartItem ci, ProductVariant variant) {
        Product product = variant.getProduct();
        String prodName = product != null ? product.getName() : "Sản phẩm Cyber";
        Long prodId = product != null ? product.getId() : null;
        Long itemShopId = product != null ? product.getShopId() : null;
        String itemShopName = null;
        if (itemShopId != null) {
            itemShopName = shopRepository.findById(itemShopId).map(Shop::getName).orElse(null);
        }

        BigDecimal price = variant.getPrice();
        BigDecimal salePrice = variant.getSalePrice();
        BigDecimal effectivePrice = resolveEffectivePrice(variant);
        BigDecimal lineTotal = effectivePrice.multiply(BigDecimal.valueOf(ci.getQuantity()));
        String imgUrl = resolveProductImageUrl(product);

        int stock = 0;
        Inventory inv = inventoryRepository.findById(variant.getId()).orElse(null);
        if (inv != null) {
            stock = inv.getAvailableQuantity();
        }

        return CartItemResponse.builder()
                .id(ci.getId())
                .variantId(variant.getId())
                .productId(prodId)
                .shopId(itemShopId)
                .shopName(itemShopName)
                .productName(prodName)
                .variantName(variant.getVariantName())
                .sku(variant.getSku())
                .imageUrl(imgUrl)
                .price(price)
                .salePrice(salePrice)
                .quantity(ci.getQuantity())
                .stockQuantity(stock)
                .lineTotal(lineTotal)
                .addedAt(ci.getAddedAt())
                .build();
    }

    private CartResponse mapToCartResponse(Cart cart) {
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalItems = 0;

        for (CartItem ci : items) {
            ProductVariant variant = productVariantRepository.findById(ci.getVariantId()).orElse(null);
            if (variant == null) {
                continue;
            }

            CartItemResponse response = buildCartItemResponse(ci, variant);
            boolean inStock = response.getStockQuantity() != null && response.getStockQuantity() > 0;
            if (inStock) {
                subtotal = subtotal.add(response.getLineTotal());
                totalItems += ci.getQuantity();
            }
            itemResponses.add(response);
        }

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(itemResponses)
                .totalItems(totalItems)
                .subtotal(subtotal)
                .build();
    }
}

