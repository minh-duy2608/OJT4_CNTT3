package com.example.demo.service.impl;

import com.example.demo.dto.request.AddressRequest;
import com.example.demo.dto.response.AddressResponse;
import com.example.demo.entity.Address;
import com.example.demo.entity.User;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.AddressRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AddressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getUserAddresses(String currentUsername) {
        User user = findUser(currentUsername);
        return addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user)
                .stream()
                .map(AddressResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AddressResponse createAddress(String currentUsername, AddressRequest request) {
        User user = findUser(currentUsername);
        long existingCount = addressRepository.countByUser(user);

        // Quy tắc: Nếu là địa chỉ đầu tiên, hoặc request đánh dấu isDefault = true
        // thì địa chỉ này trở thành mặc định duy nhất, các địa chỉ khác bị hủy cờ mặc định
        boolean shouldBeDefault = existingCount == 0 || Boolean.TRUE.equals(request.getIsDefault());

        if (shouldBeDefault) {
            addressRepository.resetDefaultByUser(user);
        }

        Address address = Address.builder()
                .user(user)
                .recipientName(request.getRecipientName().trim())
                .phone(request.getPhone().trim())
                .province(request.getProvince().trim())
                .district(request.getDistrict() != null ? request.getDistrict().trim() : null)
                .ward(request.getWard() != null ? request.getWard().trim() : null)
                .addressDetail(request.getAddressDetail().trim())
                .deliveryNote(request.getDeliveryNote() != null ? request.getDeliveryNote().trim() : "home")
                .isDefault(shouldBeDefault)
                .build();

        Address saved = addressRepository.save(address);
        log.info("Created address ID {} for user {} (isDefault: {})", saved.getId(), currentUsername, shouldBeDefault);
        return AddressResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(String currentUsername, Long addressId, AddressRequest request) {
        User user = findUser(currentUsername);
        Address address = addressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ với ID: " + addressId));

        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault());
        if (shouldBeDefault && !address.isDefault()) {
            addressRepository.resetDefaultByUser(user);
            address.setDefault(true);
        }

        address.setRecipientName(request.getRecipientName().trim());
        address.setPhone(request.getPhone().trim());
        address.setProvince(request.getProvince().trim());
        if (request.getDistrict() != null) address.setDistrict(request.getDistrict().trim());
        if (request.getWard() != null) address.setWard(request.getWard().trim());
        address.setAddressDetail(request.getAddressDetail().trim());
        if (request.getDeliveryNote() != null) address.setDeliveryNote(request.getDeliveryNote().trim());

        Address updated = addressRepository.save(address);
        log.info("Updated address ID {} for user {}", addressId, currentUsername);
        return AddressResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public AddressResponse setDefaultAddress(String currentUsername, Long addressId) {
        User user = findUser(currentUsername);
        Address address = addressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ với ID: " + addressId));

        // Hủy cờ mặc định của tất cả địa chỉ cũ của user
        addressRepository.resetDefaultByUser(user);

        // Đặt địa chỉ này làm mặc định duy nhất
        address.setDefault(true);
        Address updated = addressRepository.save(address);
        log.info("Address ID {} is now the ONLY default address for user {}", addressId, currentUsername);
        return AddressResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteAddress(String currentUsername, Long addressId) {
        User user = findUser(currentUsername);
        Address address = addressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ với ID: " + addressId));

        boolean wasDefault = address.isDefault();
        addressRepository.delete(address);
        log.info("Deleted address ID {} for user {}", addressId, currentUsername);

        // Nếu địa chỉ bị xóa là địa chỉ mặc định và user vẫn còn địa chỉ khác,
        // tự động chuyển 1 địa chỉ còn lại thành mặc định
        if (wasDefault) {
            addressRepository.findFirstByUserOrderByIdDesc(user).ifPresent(remaining -> {
                remaining.setDefault(true);
                addressRepository.save(remaining);
                log.info("Promoted address ID {} as new default for user {}", remaining.getId(), currentUsername);
            });
        }
    }

    private User findUser(String usernameOrEmail) {
        return userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + usernameOrEmail));
    }
}

