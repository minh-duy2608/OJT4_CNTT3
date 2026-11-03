package com.example.demo.controller;

import com.example.demo.dto.request.AddToWishlistRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.WishlistResponse;
import com.example.demo.service.WishlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/wishlist", "/api/v1/wishlist"})
public class WishlistController {

    private final WishlistService wishlistService;

    /**
     * STT 79: GET /wishlist - Lấy danh sách yêu thích (CLIENT)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<WishlistResponse>> getWishlist(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        WishlistResponse response = wishlistService.getWishlist(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu thích thành công", response));
    }

    /**
     * STT 80: POST /wishlist/items - Thêm sản phẩm vào yêu thích (CLIENT)
     */
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<WishlistResponse>> addToWishlist(
            @Valid @RequestBody AddToWishlistRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        WishlistResponse response = wishlistService.addToWishlist(request, username);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm sản phẩm vào danh sách yêu thích", response));
    }

    /**
     * STT 81: DELETE /wishlist/items/{itemId} - Xóa sản phẩm khỏi danh sách yêu thích (CLIENT)
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<WishlistResponse>> removeFromWishlist(
            @PathVariable Long itemId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        WishlistResponse response = wishlistService.removeFromWishlist(itemId, username);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa sản phẩm khỏi danh sách yêu thích", response));
    }

    /**
     * STT 82: DELETE /wishlist/items - Xóa toàn bộ danh sách yêu thích (CLIENT)
     */
    @DeleteMapping({"", "/items"})
    public ResponseEntity<ApiResponse<Void>> clearWishlist(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        wishlistService.clearWishlist(username);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa toàn bộ danh sách yêu thích", null));
    }
}

