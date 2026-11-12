package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.AddToCartRequest;
import com.example.demo.dto.response.CartResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.CartServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Cart Service Unit Tests")
class CartServiceTest extends BaseUnitTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ShopRepository shopRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private User user;
    private Cart cart;
    private Product product;
    private ProductVariant variant;
    private Inventory inventory;
    private Shop shop;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).username("testuser").email("test@example.com").build();
        cart = Cart.builder().id(10L).userId(1L).build();
        shop = Shop.builder().id(20L).name("Test Shop").status(ShopStatus.ACTIVE).build();

        product = Product.builder()
                .id(100L)
                .name("Test Product")
                .status(ProductStatus.ACTIVE)
                .shopId(20L)
                .build();

        variant = ProductVariant.builder()
                .id(200L)
                .product(product)
                .variantName("Variant Red")
                .sku("SKU-RED")
                .price(BigDecimal.valueOf(100000))
                .salePrice(BigDecimal.valueOf(90000))
                .status(ProductVariantStatus.ACTIVE)
                .build();

        inventory = Inventory.builder()
                .variantId(200L)
                .quantity(50)
                .reservedQuantity(0)
                .build();
    }

    @Test
    @DisplayName("getCart: unauthenticated user throws UnauthorizedException")
    void getCart_unauthenticated() {
        assertThrows(UnauthorizedException.class, () -> cartService.getCart(null));
        assertThrows(UnauthorizedException.class, () -> cartService.getCart("   "));
    }

    @Test
    @DisplayName("getCart: user not found throws ResourceNotFoundException")
    void getCart_userNotFound() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> cartService.getCart("unknown"));
    }

    @Test
    @DisplayName("getCart: existing cart returns CartResponse")
    void getCart_existingCart() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        CartResponse response = cartService.getCart("testuser");

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(1L, response.getUserId());
        assertEquals(0, response.getTotalItems());
        assertEquals(BigDecimal.ZERO, response.getSubtotal());
    }

    @Test
    @DisplayName("getCart: creates new cart if not exists")
    void getCart_createNewCart() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        CartResponse response = cartService.getCart("testuser");

        assertNotNull(response);
        assertEquals(10L, response.getId());
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    @DisplayName("addToCart: variant not found throws ResourceNotFoundException")
    void addToCart_variantNotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(999L)).thenReturn(Optional.empty());

        AddToCartRequest req = AddToCartRequest.builder().variantId(999L).quantity(1).build();
        assertThrows(ResourceNotFoundException.class, () -> cartService.addToCart(req, "testuser"));
    }

    @Test
    @DisplayName("addToCart: product inactive or deleted throws BadRequestException")
    void addToCart_inactiveProduct() {
        product.setStatus(ProductStatus.INACTIVE);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(1).build();
        assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));

        product.setStatus(ProductStatus.ACTIVE);
        product.setDeletedAt(LocalDateTime.now());
        assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));
    }

    @Test
    @DisplayName("addToCart: variant inactive throws BadRequestException")
    void addToCart_inactiveVariant() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.INACTIVE);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(1).build();
        assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));
    }

    @Test
    @DisplayName("addToCart: inactive shop throws BadRequestException")
    void addToCart_inactiveShop() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.ACTIVE);
        shop.setStatus(ShopStatus.SUSPENDED);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(1).build();
        assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));
    }

    @Test
    @DisplayName("addToCart: out of stock throws BadRequestException")
    void addToCart_outOfStock() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.ACTIVE);
        shop.setStatus(ShopStatus.ACTIVE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(Inventory.builder().variantId(200L).quantity(0).reservedQuantity(0).build()));

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(1).build();
        BadRequestException ex = assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));
        assertTrue(ex.getMessage().contains("hết hàng"));
    }

    @Test
    @DisplayName("addToCart: insufficient stock throws BadRequestException")
    void addToCart_insufficientStock() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.ACTIVE);
        shop.setStatus(ShopStatus.ACTIVE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(Inventory.builder().variantId(200L).quantity(2).reservedQuantity(0).build()));
        when(cartItemRepository.findByCartIdAndVariantId(10L, 200L)).thenReturn(Optional.empty());

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(5).build();
        assertThrows(BadRequestException.class, () -> cartService.addToCart(req, "testuser"));
    }

    @Test
    @DisplayName("addToCart: success adds new cart item")
    void addToCart_successNewItem() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.ACTIVE);
        shop.setStatus(ShopStatus.ACTIVE);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(cartItemRepository.findByCartIdAndVariantId(10L, 200L)).thenReturn(Optional.empty());

        CartItem savedItem = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(savedItem));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L)).thenReturn(Collections.emptyList());

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(2).build();
        CartResponse response = cartService.addToCart(req, "testuser");

        assertNotNull(response);
        assertEquals(2, response.getTotalItems());
        assertEquals(BigDecimal.valueOf(180000), response.getSubtotal());
        verify(cartItemRepository).save(any(CartItem.class));
    }

    @Test
    @DisplayName("addToCart: success updates existing cart item quantity")
    void addToCart_successExistingItem() {
        product.setDeletedAt(null);
        variant.setStatus(ProductVariantStatus.ACTIVE);
        shop.setStatus(ShopStatus.ACTIVE);

        CartItem existingItem = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(cartItemRepository.findByCartIdAndVariantId(10L, 200L)).thenReturn(Optional.of(existingItem));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(existingItem));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L)).thenReturn(Collections.emptyList());

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(3).build();
        CartResponse response = cartService.addToCart(req, "testuser");

        assertNotNull(response);
        assertEquals(5, existingItem.getQuantity());
        verify(cartItemRepository).save(existingItem);
    }

    @Test
    @DisplayName("updateItemQuantity: item not found throws ResourceNotFoundException")
    void updateItemQuantity_itemNotFound() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> cartService.updateItemQuantity(999L, 2, "testuser"));
    }

    @Test
    @DisplayName("updateItemQuantity: item belongs to different cart throws BadRequestException")
    void updateItemQuantity_wrongCart() {
        Cart otherCart = Cart.builder().id(99L).userId(2L).build();
        CartItem item = CartItem.builder().id(50L).cart(otherCart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));

        assertThrows(BadRequestException.class, () -> cartService.updateItemQuantity(50L, 2, "testuser"));
    }

    @Test
    @DisplayName("updateItemQuantity: quantity <= 0 deletes item")
    void updateItemQuantity_deleteWhenZero() {
        CartItem item = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        CartResponse response = cartService.updateItemQuantity(50L, 0, "testuser");

        assertNotNull(response);
        verify(cartItemRepository).delete(item);
    }

    @Test
    @DisplayName("updateItemQuantity: out of stock throws BadRequestException")
    void updateItemQuantity_outOfStock() {
        CartItem item = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(Inventory.builder().variantId(200L).quantity(0).reservedQuantity(0).build()));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> cartService.updateItemQuantity(50L, 3, "testuser"));
        assertTrue(ex.getMessage().contains("hết hàng"));
    }

    @Test
    @DisplayName("updateItemQuantity: quantity exceeds available stock throws BadRequestException")
    void updateItemQuantity_exceedsStock() {
        CartItem item = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(Inventory.builder().variantId(200L).quantity(5).reservedQuantity(0).build()));

        assertThrows(BadRequestException.class, () -> cartService.updateItemQuantity(50L, 10, "testuser"));
    }

    @Test
    @DisplayName("updateItemQuantity: success updates quantity")
    void updateItemQuantity_success() {
        CartItem item = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(cartItemRepository.findByCartId(10L)).thenReturn(List.of(item));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L)).thenReturn(Collections.emptyList());
        when(shopRepository.findById(20L)).thenReturn(Optional.of(shop));

        CartResponse response = cartService.updateItemQuantity(50L, 4, "testuser");

        assertNotNull(response);
        assertEquals(4, item.getQuantity());
        verify(cartItemRepository).save(item);
    }

    @Test
    @DisplayName("removeItem: success removes item from cart")
    void removeItem_success() {
        CartItem item = CartItem.builder().id(50L).cart(cart).variantId(200L).quantity(2).build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findById(50L)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        CartResponse response = cartService.removeItem(50L, "testuser");

        assertNotNull(response);
        verify(cartItemRepository).delete(item);
    }

    @Test
    @DisplayName("clearCart: deletes all items in user's cart")
    void clearCart_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));

        cartService.clearCart("testuser");

        verify(cartItemRepository).deleteByCartId(10L);
    }

    @Test
    @DisplayName("syncCart: synchronizes multiple cart items")
    void syncCart_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(Inventory.builder().variantId(200L).quantity(10).reservedQuantity(0).build()));
        when(cartItemRepository.findByCartIdAndVariantId(10L, 200L)).thenReturn(Optional.empty());
        when(cartItemRepository.findByCartId(10L)).thenReturn(Collections.emptyList());

        AddToCartRequest req = AddToCartRequest.builder().variantId(200L).quantity(3).build();
        CartResponse response = cartService.syncCart(List.of(req), "testuser");

        assertNotNull(response);
        verify(cartItemRepository).save(any(CartItem.class));
    }
}
