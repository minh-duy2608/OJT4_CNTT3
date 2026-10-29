package com.example.demo.service;

import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductImageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.ProductVariantResponse;

import java.util.List;

public interface ProductService {

    /**
     * STT 39: GET /products - Danh sách sản phẩm, có phân trang và lọc đa tiêu chí (Public)
     */
    PageResponse<ProductSummaryResponse> getProducts(ProductFilterCriteria criteria);

    /**
     * STT 40: GET /products/{productId} - Chi tiết sản phẩm (Public)
     */
    ProductDetailResponse getProductById(Long productId);

    /**
     * STT 41: GET /products/{productId}/variants - Danh sách biến thể sản phẩm (Public)
     */
    List<ProductVariantResponse> getProductVariants(Long productId);

    /**
     * STT 42: GET /products/{productId}/images - Danh sách hình ảnh sản phẩm (Public)
     */
    List<ProductImageResponse> getProductImages(Long productId);

    /**
     * STT 43: GET /products/search - Tìm kiếm sản phẩm (Public)
     */
    PageResponse<ProductSummaryResponse> searchProducts(ProductFilterCriteria criteria);

    /**
     * STT 44: GET /shops/{shopId}/products - Sản phẩm công khai của cửa hàng (Public)
     */
    PageResponse<ProductSummaryResponse> getShopProducts(Long shopId, ProductFilterCriteria criteria);
}
