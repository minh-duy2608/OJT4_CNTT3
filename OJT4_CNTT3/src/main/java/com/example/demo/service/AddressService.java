package com.example.demo.service;

import com.example.demo.dto.request.AddressRequest;
import com.example.demo.dto.response.AddressResponse;

import java.util.List;

public interface AddressService {

    List<AddressResponse> getUserAddresses(String currentUsername);

    AddressResponse createAddress(String currentUsername, AddressRequest request);

    AddressResponse updateAddress(String currentUsername, Long addressId, AddressRequest request);

    AddressResponse setDefaultAddress(String currentUsername, Long addressId);

    void deleteAddress(String currentUsername, Long addressId);
}
