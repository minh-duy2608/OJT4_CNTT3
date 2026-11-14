package com.example.demo.controller;

import com.example.demo.dto.request.CreateCouponRequest;
import com.example.demo.dto.request.UpdateCouponRequest;
import com.example.demo.dto.request.UpdateCouponStatusRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.CouponDiscountType;
import com.example.demo.entity.CouponStatus;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.CouponService;
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

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminCouponController Unit Tests")
class AdminCouponControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CouponService couponService;

    @Mock
    private Principal principal;

    @InjectMocks
    private AdminCouponController adminCouponController;

    @BeforeEach
    void setUp() {
        objectMapper.findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(adminCouponController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /admin/coupons: returns paged coupons")
    void getAllCoupons_success() throws Exception {
        CouponResponse coupon = CouponResponse.builder().id(1L).code("SALE10").build();
        PageResponse<CouponResponse> pageRes = PageResponse.<CouponResponse>builder()
                .content(List.of(coupon))
                .totalElements(1L)
                .build();

        when(principal.getName()).thenReturn("admin");
        when(couponService.getAdminCoupons(any(), any(), any(), anyInt(), anyInt(), eq("admin")))
                .thenReturn(pageRes);

        mockMvc.perform(get("/admin/coupons").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /admin/coupons/{id}: returns coupon detail")
    void getCouponById_success() throws Exception {
        CouponResponse coupon = CouponResponse.builder().id(1L).code("SALE10").build();

        when(principal.getName()).thenReturn("admin");
        when(couponService.getAdminCouponById(1L, "admin")).thenReturn(coupon);

        mockMvc.perform(get("/admin/coupons/1").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("SALE10"));
    }

    @Test
    @DisplayName("POST /admin/coupons: creates new coupon")
    void createCoupon_success() throws Exception {
        CreateCouponRequest req = CreateCouponRequest.builder()
                .code("NEWYEAR2026")
                .name("New Year Promo")
                .discountType(CouponDiscountType.PERCENTAGE)
                .discountValue(BigDecimal.valueOf(10))
                .startAt(LocalDateTime.now())
                .endAt(LocalDateTime.now().plusDays(10))
                .build();

        CouponResponse coupon = CouponResponse.builder().id(2L).code("NEWYEAR2026").build();

        when(principal.getName()).thenReturn("admin");
        when(couponService.createCoupon(any(CreateCouponRequest.class), eq("admin"))).thenReturn(coupon);

        mockMvc.perform(post("/admin/coupons")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("NEWYEAR2026"));
    }

    @Test
    @DisplayName("DELETE /admin/coupons/{id}: deletes coupon")
    void deleteCoupon_success() throws Exception {
        when(principal.getName()).thenReturn("admin");

        mockMvc.perform(delete("/admin/coupons/1").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(couponService).deleteCoupon(1L, "admin");
    }
}
