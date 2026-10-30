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

    /**
     * Admin: POST /admin/products - Tạo sản phẩm mới kèm biến thể và hình ảnh
     */
    ProductDetailResponse createProduct(com.example.demo.dto.request.CreateProductRequest request);

    /**
     * Admin: PUT /admin/products/{productId} - Cập nhật sản phẩm, biến thể và hình ảnh
     */
    ProductDetailResponse updateProduct(Long productId, com.example.demo.dto.request.UpdateProductRequest request);

    /**
     * Admin: DELETE /admin/products/{productId} - Xóa hoặc ngừng sử dụng sản phẩm
     */
    void deleteProduct(Long productId, boolean force);

    /**
     * STT 45: GET /shops/{shopId}/manage/products - Danh sách sản phẩm trong phạm vi quản lý (Shop permission)
     */
    PageResponse<ProductSummaryResponse> getShopManagedProducts(Long shopId, ProductFilterCriteria criteria, String currentUsername);

    /**
     * STT 46: POST /shops/{shopId}/products - Tạo sản phẩm (Shop permission)
     */
    ProductDetailResponse createShopProduct(Long shopId, com.example.demo.dto.request.CreateProductRequest request, String currentUsername);

    /**
     * STT 47: GET /shops/{shopId}/products/{productId} - Chi tiết sản phẩm trong phạm vi quản lý (Shop permission)
     */
    ProductDetailResponse getShopProductById(Long shopId, Long productId, String currentUsername);

    /**
     * STT 48: PATCH /shops/{shopId}/products/{productId} - Cập nhật thông tin sản phẩm (Shop permission)
     */
    ProductDetailResponse updateShopProduct(Long shopId, Long productId, com.example.demo.dto.request.UpdateProductRequest request, String currentUsername);

    /**
     * STT 49: PATCH /shops/{shopId}/products/{productId}/status - Thay đổi trạng thái sản phẩm (Shop permission)
     */
    ProductDetailResponse updateShopProductStatus(Long shopId, Long productId, com.example.demo.entity.ProductStatus status, String currentUsername);

    /**
     * STT 50: DELETE /shops/{shopId}/products/{productId} - Ngừng kinh doanh hoặc xóa theo chính sách (Shop permission)
     */
    void deleteShopProduct(Long shopId, Long productId, boolean force, String currentUsername);

    /**
     * STT 51: POST /shops/{shopId}/products/{productId}/variants - Tạo biến thể sản phẩm (Shop permission)
     */
    ProductVariantResponse createShopProductVariant(Long shopId, Long productId, com.example.demo.dto.request.CreateProductVariantRequest request, String currentUsername);

    /**
     * STT 52: PATCH /shops/{shopId}/products/{productId}/variants/{variantId} - Cập nhật biến thể (Shop permission)
     */
    ProductVariantResponse updateShopProductVariant(Long shopId, Long productId, Long variantId, com.example.demo.dto.request.CreateProductVariantRequest request, String currentUsername);

    /**
     * STT 53: DELETE /shops/{shopId}/products/{productId}/variants/{variantId} - Xóa hoặc vô hiệu hóa biến thể (Shop permission)
     */
    void deleteShopProductVariant(Long shopId, Long productId, Long variantId, boolean force, String currentUsername);

    /**
     * STT 54: POST /shops/{shopId}/products/{productId}/images - Thêm hình ảnh sản phẩm (Shop permission)
     */
    ProductImageResponse addShopProductImage(Long shopId, Long productId, com.example.demo.dto.request.CreateProductImageRequest request, String currentUsername);

    /**
     * STT 55: PATCH /shops/{shopId}/products/{productId}/images/{imageId} - Cập nhật thứ tự hoặc thuộc tính hình ảnh (Shop permission)
     */
    ProductImageResponse updateShopProductImage(Long shopId, Long productId, Long imageId, com.example.demo.dto.request.UpdateProductImageRequest request, String currentUsername);

    /**
     * STT 56: DELETE /shops/{shopId}/products/{productId}/images/{imageId} - Xóa hình ảnh sản phẩm (Shop permission)
     */
    void deleteShopProductImage(Long shopId, Long productId, Long imageId, String currentUsername);
}

