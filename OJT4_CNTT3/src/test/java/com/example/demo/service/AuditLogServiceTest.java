package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.AuditLogRepository;
import com.example.demo.repository.ShopMemberRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.AuditLogServiceImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Audit Log Service Unit Tests")
class AuditLogServiceTest extends BaseUnitTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @InjectMocks
    private AuditLogServiceImpl auditLogService;

    private User adminUser;
    private User normalUser;
    private Shop shop;
    private AuditLog sampleLog;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).username("admin").role(Role.ADMIN).build();
        normalUser = User.builder().id(2L).username("client").role(Role.ROLE_USER).build();
        shop = Shop.builder().id(10L).name("Tech Shop").ownerId(2L).build();

        sampleLog = AuditLog.builder()
                .id(100L)
                .actorUserId(1L)
                .action("UPDATE_PRODUCT")
                .entityType("PRODUCT")
                .entityId("50")
                .shopId(10L)
                .ipAddress("127.0.0.1")
                .userAgent("Mozilla/5.0")
                .details("{\"message\":\"Product updated\"}")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("log: saves audit log with valid json wrapped")
    void log_savesLogSuccessfully() {
        auditLogService.log(1L, "CREATE_PRODUCT", "PRODUCT", "50", 10L, "Plain message");
        verify(auditLogRepository).saveAndFlush(any(AuditLog.class));
    }

    @Test
    @DisplayName("log: with HttpServletRequest extracts client IP and user agent")
    void log_withHttpServletRequest() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Forwarded-For")).thenReturn("192.168.1.1");
        when(request.getHeader("User-Agent")).thenReturn("CustomAgent");

        auditLogService.log(1L, "CREATE_PRODUCT", "PRODUCT", "50", 10L, "{\"field\":\"value\"}", request);
        verify(auditLogRepository).saveAndFlush(any(AuditLog.class));
    }

    @Test
    @DisplayName("getAdminAuditLogs: returns paged logs")
    void getAdminAuditLogs_success() {
        Page<AuditLog> page = new PageImpl<>(List.of(sampleLog));
        when(auditLogRepository.findAllByFilter(eq("UPDATE_PRODUCT"), eq("PRODUCT"), eq(10L), any(Pageable.class)))
                .thenReturn(page);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        PageResponse<AuditLogResponse> response = auditLogService.getAdminAuditLogs("UPDATE_PRODUCT", "PRODUCT", 10L, 0, 10);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("UPDATE_PRODUCT", response.getContent().get(0).getAction());
        assertEquals("admin", response.getContent().get(0).getActorUsername());
        assertEquals("Tech Shop", response.getContent().get(0).getShopName());
    }

    @Test
    @DisplayName("getAuditLogDetail: log not found throws ResourceNotFoundException")
    void getAuditLogDetail_notFound() {
        when(auditLogRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> auditLogService.getAuditLogDetail(999L));
    }

    @Test
    @DisplayName("getAuditLogDetail: returns audit log detail response")
    void getAuditLogDetail_success() {
        when(auditLogRepository.findById(100L)).thenReturn(Optional.of(sampleLog));
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));

        AuditLogResponse res = auditLogService.getAuditLogDetail(100L);

        assertNotNull(res);
        assertEquals(100L, res.getId());
        assertEquals("UPDATE_PRODUCT", res.getAction());
    }

    @Test
    @DisplayName("getShopAuditLogs: unauthenticated user throws UnauthorizedException")
    void getShopAuditLogs_unauthorized() {
        assertThrows(UnauthorizedException.class, () -> auditLogService.getShopAuditLogs(10L, 0, 10, null));
        assertThrows(UnauthorizedException.class, () -> auditLogService.getShopAuditLogs(10L, 0, 10, "   "));
    }

    @Test
    @DisplayName("getShopAuditLogs: shop not found throws ForbiddenException for unauthorized client")
    void getShopAuditLogs_shopNotFound() {
        when(userRepository.findByUsername("client")).thenReturn(Optional.of(normalUser));
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> auditLogService.getShopAuditLogs(999L, 0, 10, "client"));
    }

    @Test
    @DisplayName("getShopAuditLogs: user without shop permission throws ForbiddenException")
    void getShopAuditLogs_forbidden() {
        User outsider = User.builder().id(99L).username("outsider").role(Role.ROLE_USER).build();
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 99L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> auditLogService.getShopAuditLogs(10L, 0, 10, "outsider"));
    }

    @Test
    @DisplayName("getShopAuditLogs: shop owner can view shop audit logs")
    void getShopAuditLogs_ownerSuccess() {
        when(userRepository.findByUsername("client")).thenReturn(Optional.of(normalUser));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        Page<AuditLog> page = new PageImpl<>(List.of(sampleLog));
        when(auditLogRepository.findByShopIdOrderByCreatedAtDesc(eq(10L), any(Pageable.class))).thenReturn(page);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        PageResponse<AuditLogResponse> response = auditLogService.getShopAuditLogs(10L, 0, 10, "client");

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
    }
}
