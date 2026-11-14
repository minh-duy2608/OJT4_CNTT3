package com.example.demo.controller;

import com.example.demo.dto.request.AddToCartRequest;
import com.example.demo.dto.request.UpdateCartItemRequest;
import com.example.demo.dto.response.CartResponse;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.CartService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("CartController Unit Tests")
class CartControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CartService cartService;

    @Mock
    private Principal principal;

    @InjectMocks
    private CartController cartController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(cartController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /cart: returns user cart")
    void getCart_success() throws Exception {
        CartResponse cartResponse = CartResponse.builder().id(1L).totalItems(2).build();
        when(principal.getName()).thenReturn("testuser");
        when(cartService.getCart("testuser")).thenReturn(cartResponse);

        mockMvc.perform(get("/cart").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(2));
    }

    @Test
    @DisplayName("POST /cart/items: adds item to cart")
    void addToCart_success() throws Exception {
        AddToCartRequest req = AddToCartRequest.builder().variantId(10L).quantity(1).build();
        CartResponse cartResponse = CartResponse.builder().id(1L).totalItems(1).build();

        when(principal.getName()).thenReturn("testuser");
        when(cartService.addToCart(any(AddToCartRequest.class), eq("testuser"))).thenReturn(cartResponse);

        mockMvc.perform(post("/cart/items")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(1));
    }

    @Test
    @DisplayName("PATCH /cart/items/{itemId}: updates item quantity")
    void updateItemQuantity_success() throws Exception {
        UpdateCartItemRequest req = new UpdateCartItemRequest();
        req.setQuantity(3);
        CartResponse cartResponse = CartResponse.builder().id(1L).totalItems(3).build();

        when(principal.getName()).thenReturn("testuser");
        when(cartService.updateItemQuantity(5L, 3, "testuser")).thenReturn(cartResponse);

        mockMvc.perform(patch("/cart/items/5")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalItems").value(3));
    }

    @Test
    @DisplayName("DELETE /cart/items/{itemId}: removes item")
    void removeItem_success() throws Exception {
        CartResponse cartResponse = CartResponse.builder().id(1L).totalItems(0).build();

        when(principal.getName()).thenReturn("testuser");
        when(cartService.removeItem(5L, "testuser")).thenReturn(cartResponse);

        mockMvc.perform(delete("/cart/items/5").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("DELETE /cart/items: clears cart")
    void clearCart_success() throws Exception {
        when(principal.getName()).thenReturn("testuser");

        mockMvc.perform(delete("/cart/items").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(cartService).clearCart("testuser");
    }

    @Test
    @DisplayName("POST /cart/sync: syncs items from client")
    void syncCart_success() throws Exception {
        AddToCartRequest req = AddToCartRequest.builder().variantId(10L).quantity(2).build();
        CartResponse cartResponse = CartResponse.builder().id(1L).totalItems(2).build();

        when(principal.getName()).thenReturn("testuser");
        when(cartService.syncCart(anyList(), eq("testuser"))).thenReturn(cartResponse);

        mockMvc.perform(post("/cart/sync")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(req))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

