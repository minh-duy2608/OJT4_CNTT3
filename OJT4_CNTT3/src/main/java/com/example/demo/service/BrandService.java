package com.example.demo.service;

import com.example.demo.dto.request.CreateBrandRequest;
import com.example.demo.dto.request.UpdateBrandRequest;
import com.example.demo.dto.response.BrandResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.BrandStatus;

import java.util.List;

public interface BrandService {

    /**
     * STT 33: GET /brands - Danh sách thương hiệu (Public)
     */
    List<BrandResponse> getBrands(BrandStatus status);

    /**
     * STT 34: GET /brands/{brandId} - Chi tiết thương hiệu (Public)
     */
    BrandResponse getBrandById(Long brandId);

    /**
     * STT 35: GET /brands/{brandId}/products - Sản phẩm thuộc thương hiệu (Public)
     */
    PageResponse<ProductSummaryResponse> getBrandProducts(Long brandId, int page, int size, String sortBy, String sortDir);

    /**
     * STT 36: POST /admin/brands - Tạo thương hiệu mới (ADMIN)
     */
    BrandResponse createBrand(CreateBrandRequest request);

    /**
     * STT 37: PATCH /admin/brands/{brandId} - Cập nhật thương hiệu (ADMIN)
     */
    BrandResponse updateBrand(Long brandId, UpdateBrandRequest request);

    /**
     * STT 38: DELETE /admin/brands/{brandId} - Xóa hoặc ngừng sử dụng thương hiệu (ADMIN)
     */
    void deleteBrand(Long brandId, boolean force);
}
