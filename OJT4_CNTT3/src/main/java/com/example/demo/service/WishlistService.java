package com.example.demo.service;

import com.example.demo.dto.request.AddToWishlistRequest;
import com.example.demo.dto.response.WishlistResponse;

public interface WishlistService {

    /**
     * STT 79: GET /wishlist - Lấy danh sách yêu thích (CLIENT)
     */
    WishlistResponse getWishlist(String currentUsername);

    /**
     * STT 80: POST /wishlist/items - Thêm sản phẩm vào yêu thích (CLIENT)
     */
    WishlistResponse addToWishlist(AddToWishlistRequest request, String currentUsername);

    /**
     * STT 81: DELETE /wishlist/items/{itemId} - Xóa sản phẩm khỏi danh sách yêu thích (CLIENT)
     */
    WishlistResponse removeFromWishlist(Long productIdOrItemId, String currentUsername);

    /**
     * STT 82: DELETE /wishlist/items - Xóa toàn bộ danh sách yêu thích (CLIENT)
     */
    void clearWishlist(String currentUsername);
}
