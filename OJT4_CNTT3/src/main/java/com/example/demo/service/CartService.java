package com.example.demo.service;

import com.example.demo.dto.request.AddToCartRequest;
import com.example.demo.dto.response.CartResponse;

import java.util.List;

public interface CartService {

    CartResponse getCart(String currentUsername);

    CartResponse addToCart(AddToCartRequest request, String currentUsername);

    CartResponse updateItemQuantity(Long itemId, int quantity, String currentUsername);

    CartResponse removeItem(Long itemId, String currentUsername);

    void clearCart(String currentUsername);

    CartResponse syncCart(List<AddToCartRequest> items, String currentUsername);
}
