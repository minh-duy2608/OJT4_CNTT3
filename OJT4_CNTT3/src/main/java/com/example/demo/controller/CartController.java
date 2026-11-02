package com.example.demo.controller;

import com.example.demo.dto.request.AddToCartRequest;
import com.example.demo.dto.request.UpdateCartItemRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CartResponse;
import com.example.demo.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/cart", "/api/v1/cart"})
public class CartController {

    private final CartService cartService;

    /**
     * Lấy giỏ hàng của người dùng hiện tại
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        CartResponse response = cartService.getCart(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin giỏ hàng thành công", response));
    }

    /**
     * Thêm sản phẩm vào giỏ hàng
     */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(
            @Valid @RequestBody AddToCartRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CartResponse response = cartService.addToCart(request, username);
        return ResponseEntity.ok(ApiResponse.success("Thêm vào giỏ hàng thành công", response));
    }

    /**
     * Cập nhật số lượng của một sản phẩm trong giỏ
     */
    @PatchMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItemQuantity(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CartResponse response = cartService.updateItemQuantity(itemId, request.getQuantity(), username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật số lượng thành công", response));
    }

    /**
     * Xóa một sản phẩm khỏi giỏ hàng
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeItem(
            @PathVariable Long itemId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CartResponse response = cartService.removeItem(itemId, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa sản phẩm khỏi giỏ hàng thành công", response));
    }

    /**
     * Xóa sạch toàn bộ giỏ hàng
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        cartService.clearCart(username);
        return ResponseEntity.ok(ApiResponse.success("Xóa sạch giỏ hàng thành công", null));
    }

    /**
     * Đồng bộ danh sách sản phẩm từ client vào giỏ hàng trên DB
     */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<CartResponse>> syncCart(
            @RequestBody List<AddToCartRequest> items,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CartResponse response = cartService.syncCart(items, username);
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ giỏ hàng thành công", response));
    }
}

