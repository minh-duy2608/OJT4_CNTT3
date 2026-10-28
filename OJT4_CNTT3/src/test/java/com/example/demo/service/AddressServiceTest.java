package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.AddressRequest;
import com.example.demo.dto.response.AddressResponse;
import com.example.demo.entity.Address;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.AddressRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.AddressServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Address Service Unit Tests")
class AddressServiceTest extends BaseUnitTest {

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AddressServiceImpl addressService;

    private User testUser;
    private Address defaultAddress;
    private Address secondaryAddress;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testcustomer")
                .email("customer@example.com")
                .role(Role.CLIENT)
                .build();

        defaultAddress = Address.builder()
                .id(101L)
                .user(testUser)
                .recipientName("Nguyen Van A")
                .phone("0901234567")
                .province("TP. Hồ Chí Minh")
                .district("Quận 1")
                .ward("Bến Nghé")
                .addressDetail("123 Lê Lợi")
                .deliveryNote("home")
                .isDefault(true)
                .build();

        secondaryAddress = Address.builder()
                .id(102L)
                .user(testUser)
                .recipientName("Nguyen Van A (Công ty)")
                .phone("0901234567")
                .province("TP. Hồ Chí Minh")
                .district("Quận 3")
                .ward("Võ Thị Sáu")
                .addressDetail("456 Nam Kỳ Khởi Nghĩa")
                .deliveryNote("office")
                .isDefault(false)
                .build();
    }

    @Test
    @DisplayName("Should return list of addresses for current user")
    void getUserAddresses_success() {
        when(userRepository.findByUsernameOrEmail("testcustomer", "testcustomer"))
                .thenReturn(Optional.of(testUser));
        when(addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(testUser))
                .thenReturn(List.of(defaultAddress, secondaryAddress));

        List<AddressResponse> results = addressService.getUserAddresses("testcustomer");

        assertNotNull(results);
        assertEquals(2, results.size());
        assertTrue(results.get(0).isDefault());
        assertEquals("Nguyen Van A", results.get(0).getFullName());
    }

    @Test
    @DisplayName("Should automatically set first address as default when user has no existing addresses")
    void createAddress_firstAddress_becomesDefault() {
        when(userRepository.findByUsernameOrEmail("testcustomer", "testcustomer"))
                .thenReturn(Optional.of(testUser));
        when(addressRepository.countByUser(testUser)).thenReturn(0L);
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> {
            Address a = invocation.getArgument(0);
            a.setId(101L);
            return a;
        });

        AddressRequest request = AddressRequest.builder()
                .recipientName("Nguyen Van A")
                .phone("0901234567")
                .province("TP. Hồ Chí Minh")
                .addressDetail("123 Lê Lợi")
                .isDefault(false) // Mặc dù gửi false, nhưng vì là địa chỉ đầu tiên nên phải thành default
                .build();

        AddressResponse response = addressService.createAddress("testcustomer", request);

        assertNotNull(response);
        assertTrue(response.isDefault(), "Địa chỉ đầu tiên bắt buộc phải là địa chỉ mặc định");
        verify(addressRepository, times(1)).resetDefaultByUser(testUser);
    }

    @Test
    @DisplayName("Should reset other addresses and make target address default when setDefaultAddress called")
    void setDefaultAddress_success() {
        when(userRepository.findByUsernameOrEmail("testcustomer", "testcustomer"))
                .thenReturn(Optional.of(testUser));
        when(addressRepository.findByIdAndUser(102L, testUser))
                .thenReturn(Optional.of(secondaryAddress));
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = addressService.setDefaultAddress("testcustomer", 102L);

        assertNotNull(response);
        assertTrue(response.isDefault(), "Địa chỉ được chọn phải được đánh dấu mặc định");
        verify(addressRepository, times(1)).resetDefaultByUser(testUser);
    }

    @Test
    @DisplayName("Should promote remaining address to default when default address is deleted")
    void deleteAddress_whenDefaultDeleted_promotesRemaining() {
        when(userRepository.findByUsernameOrEmail("testcustomer", "testcustomer"))
                .thenReturn(Optional.of(testUser));
        when(addressRepository.findByIdAndUser(101L, testUser))
                .thenReturn(Optional.of(defaultAddress));
        when(addressRepository.findFirstByUserOrderByIdDesc(testUser))
                .thenReturn(Optional.of(secondaryAddress));

        addressService.deleteAddress("testcustomer", 101L);

        verify(addressRepository, times(1)).delete(defaultAddress);
        verify(addressRepository, times(1)).save(secondaryAddress);
        assertTrue(secondaryAddress.isDefault(), "Địa chỉ còn lại phải được tự động chuyển thành mặc định");
    }
}
