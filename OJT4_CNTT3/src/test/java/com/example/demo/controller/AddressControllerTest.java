package com.example.demo.controller;

import com.example.demo.dto.request.AddressRequest;
import com.example.demo.dto.response.AddressResponse;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.AddressService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AddressController Unit Tests")
class AddressControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AddressService addressService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AddressController addressController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(addressController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /addresses: returns user addresses")
    void getMyAddresses_success() throws Exception {
        AddressResponse addr = AddressResponse.builder().id(1L).recipientName("Nguyen Van A").build();
        when(authentication.getName()).thenReturn("testuser");
        when(addressService.getUserAddresses("testuser")).thenReturn(List.of(addr));

        mockMvc.perform(get("/addresses").principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].recipientName").value("Nguyen Van A"));
    }

    @Test
    @DisplayName("GET /addresses/{id}: returns address detail")
    void getAddressById_success() throws Exception {
        AddressResponse addr = AddressResponse.builder().id(1L).recipientName("Nguyen Van A").build();
        when(authentication.getName()).thenReturn("testuser");
        when(addressService.getAddressById("testuser", 1L)).thenReturn(addr);

        mockMvc.perform(get("/addresses/1").principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @DisplayName("POST /addresses: creates address")
    void createAddress_success() throws Exception {
        AddressRequest req = AddressRequest.builder()
                .recipientName("Nguyen Van A")
                .phone("0987654321")
                .addressDetail("123 Street")
                .province("Hanoi")
                .district("Cau Giay")
                .ward("Dich Vong")
                .build();

        AddressResponse addr = AddressResponse.builder().id(1L).recipientName("Nguyen Van A").build();
        when(authentication.getName()).thenReturn("testuser");
        when(addressService.createAddress(eq("testuser"), any(AddressRequest.class))).thenReturn(addr);

        mockMvc.perform(post("/addresses")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @DisplayName("PATCH /addresses/{id}/default: sets address as default")
    void setDefaultAddress_success() throws Exception {
        AddressResponse addr = AddressResponse.builder().id(1L).isDefault(true).build();
        when(authentication.getName()).thenReturn("testuser");
        when(addressService.setDefaultAddress("testuser", 1L)).thenReturn(addr);

        mockMvc.perform(patch("/addresses/1/default").principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.default").value(true));
    }

    @Test
    @DisplayName("DELETE /addresses/{id}: deletes address")
    void deleteAddress_success() throws Exception {
        when(authentication.getName()).thenReturn("testuser");

        mockMvc.perform(delete("/addresses/1").principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(addressService).deleteAddress("testuser", 1L);
    }
}
