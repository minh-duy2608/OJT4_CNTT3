package com.example.demo.controller;

import com.example.demo.dto.request.CreateProductRequest;
import com.example.demo.dto.request.UpdateProductRequest;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.ProductService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminProductController Unit Tests")
class AdminProductControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ProductService productService;

    @InjectMocks
    private AdminProductController adminProductController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminProductController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /admin/products: creates product")
    void createProduct_success() throws Exception {
        CreateProductRequest req = CreateProductRequest.builder()
                .name("Smartphone 2026")
                .categoryId(1L)
                .build();

        ProductDetailResponse res = ProductDetailResponse.builder().id(10L).name("Smartphone 2026").build();
        when(productService.createProduct(any(CreateProductRequest.class))).thenReturn(res);

        mockMvc.perform(post("/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Smartphone 2026"));
    }

    @Test
    @DisplayName("PUT /admin/products/{id}: updates product")
    void updateProduct_success() throws Exception {
        UpdateProductRequest req = UpdateProductRequest.builder().name("Updated Phone").build();
        ProductDetailResponse res = ProductDetailResponse.builder().id(10L).name("Updated Phone").build();

        when(productService.updateProduct(eq(10L), any(UpdateProductRequest.class))).thenReturn(res);

        mockMvc.perform(put("/admin/products/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Updated Phone"));
    }

    @Test
    @DisplayName("DELETE /admin/products/{id}: soft deletes product")
    void deleteProduct_softDelete() throws Exception {
        mockMvc.perform(delete("/admin/products/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(productService).deleteProduct(10L, false);
    }
}

