package com.example.demo.controller;

import com.example.demo.dto.request.CreateBrandRequest;
import com.example.demo.dto.request.UpdateBrandRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BrandResponse;
import com.example.demo.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/admin/brands", "/api/v1/admin/brands"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrandController {

    private final BrandService brandService;

    /**
     * STT 36: POST /admin/brands - Tạo thương hiệu (ADMIN)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BrandResponse>> createBrand(
            @Valid @RequestBody CreateBrandRequest request
    ) {
        BrandResponse response = brandService.createBrand(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo thương hiệu mới thành công", response));
    }

    /**
     * STT 37: PATCH /admin/brands/{brandId} - Cập nhật thương hiệu (ADMIN)
     */
    @PatchMapping("/{brandId}")
    public ResponseEntity<ApiResponse<BrandResponse>> updateBrand(
            @PathVariable Long brandId,
            @Valid @RequestBody UpdateBrandRequest request
    ) {
        BrandResponse response = brandService.updateBrand(brandId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thương hiệu thành công", response));
    }

    /**
     * STT 38: DELETE /admin/brands/{brandId} - Xóa hoặc ngừng sử dụng thương hiệu (ADMIN)
     */
    @DeleteMapping("/{brandId}")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(
            @PathVariable Long brandId,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        brandService.deleteBrand(brandId, force);
        String message = force
                ? "Đã ngừng sử dụng / vô hiệu hóa thương hiệu an toàn"
                : "Đã xóa thương hiệu thành công";
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }
}

