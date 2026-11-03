package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.AddressRequest;
import com.example.demo.dto.response.AddressResponse;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "19. Khách hàng - Sổ địa chỉ", description = "Quản lý địa chỉ giao nhận hàng và đặt địa chỉ mặc định")
@RestController
@RequestMapping({"/addresses", "/api/v1/addresses"})
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    /**
     * STT 83: GET /addresses - Danh sách địa chỉ của khách hàng (CLIENT)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getMyAddresses(Authentication authentication) {
        List<AddressResponse> addresses = addressService.getUserAddresses(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách địa chỉ thành công", addresses));
    }

    /**
     * STT 85: GET /addresses/{addressId} - Chi tiết địa chỉ (CLIENT)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> getAddressById(
            Authentication authentication,
            @PathVariable Long id
    ) {
        AddressResponse address = addressService.getAddressById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết địa chỉ thành công", address));
    }

    /**
     * STT 84: POST /addresses - Tạo địa chỉ giao hàng (CLIENT)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AddressResponse>> createAddress(
            Authentication authentication,
            @Valid @RequestBody AddressRequest request
    ) {
        AddressResponse address = addressService.createAddress(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm địa chỉ nhận hàng mới thành công", address));
    }

    /**
     * STT 86: PATCH /addresses/{addressId} (hoặc PUT) - Cập nhật địa chỉ (CLIENT)
     */
    @RequestMapping(value = "/{id}", method = {org.springframework.web.bind.annotation.RequestMethod.PATCH, org.springframework.web.bind.annotation.RequestMethod.PUT})
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request
    ) {
        AddressResponse address = addressService.updateAddress(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật địa chỉ thành công", address));
    }

    /**
     * STT 88: PATCH /addresses/{addressId}/default - Đặt địa chỉ mặc định (CLIENT)
     */
    @PatchMapping("/{id}/default")
    public ResponseEntity<ApiResponse<AddressResponse>> setDefaultAddress(
            Authentication authentication,
            @PathVariable Long id
    ) {
        AddressResponse address = addressService.setDefaultAddress(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Đã đặt làm địa chỉ nhận hàng mặc định duy nhất", address));
    }

    /**
     * STT 87: DELETE /addresses/{addressId} - Xóa địa chỉ (CLIENT)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            Authentication authentication,
            @PathVariable Long id
    ) {
        addressService.deleteAddress(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa địa chỉ thành công", null));
    }
}
