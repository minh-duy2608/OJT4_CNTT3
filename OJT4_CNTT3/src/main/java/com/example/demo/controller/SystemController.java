package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.security.Principal;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Tag(name = "21. Hỗ trợ hệ thống & Health Check", description = "Các API kiểm tra trạng thái hoạt động, thông tin phiên bản, cấu hình công khai và tài khoản hiện tại")
@RestController
@RequiredArgsConstructor
public class SystemController {

    private final AuthService authService;
    private final DataSource dataSource;

    /**
     * STT 163: GET /health - Kiểm tra tình trạng hoạt động cơ bản của hệ thống (Public)
     */
    @Operation(summary = "Kiểm tra tình trạng hoạt động cơ bản của hệ thống (Public)")
    @GetMapping({"/health", "/api/v1/health"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHealth() {
        RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
        long uptimeSeconds = runtimeBean.getUptime() / 1000;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "UP");
        data.put("application", "TechShop E-Commerce API");
        data.put("version", "1.0.0");
        data.put("timestamp", Instant.now().toString());
        data.put("uptimeSeconds", uptimeSeconds);

        return ResponseEntity.ok(ApiResponse.success("Hệ thống hoạt động bình thường", data));
    }

    /**
     * STT 164: GET /me - Xem thông tin người dùng đang đăng nhập (Authenticated)
     */
    @Operation(summary = "Xem thông tin người dùng đang đăng nhập (Authenticated)")
    @GetMapping({"/me", "/api/v1/me"})
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        if (username == null) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        UserResponse response = authService.getCurrentUser(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tài khoản thành công", response));
    }

    /**
     * STT 165: GET /config/public - Cấu hình công khai của hệ thống (Public)
     */
    @Operation(summary = "Cấu hình công khai của hệ thống (Public)")
    @GetMapping({"/config/public", "/api/v1/config/public"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("appName", "TechShop E-Commerce");
        config.put("currency", "VND");
        config.put("supportEmail", "support@techshop.com");
        config.put("hotline", "1900-1234");
        config.put("apiVersion", "v1");
        config.put("systemStatus", "OPERATIONAL");
        config.put("maxUploadSizeMb", 10);
        config.put("allowShopRegistration", true);

        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình công khai thành công", config));
    }

    /**
     * STT 166: GET /admin/health - Kiểm tra chi tiết tình trạng hệ thống, DB, RAM, uptime dành cho Admin (ADMIN)
     */
    @Operation(summary = "Kiểm tra chi tiết tình trạng hệ thống, database, bộ nhớ (ADMIN)")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping({"/admin/health", "/api/v1/admin/health"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminHealth() {
        Runtime runtime = Runtime.getRuntime();
        RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();

        Map<String, Object> memory = new LinkedHashMap<>();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        long usedMemory = totalMemory - freeMemory;
        memory.put("usedMb", usedMemory / (1024 * 1024));
        memory.put("totalMb", totalMemory / (1024 * 1024));
        memory.put("freeMb", freeMemory / (1024 * 1024));
        memory.put("maxMb", maxMemory / (1024 * 1024));

        Map<String, Object> database = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(2);
            database.put("status", valid ? "UP" : "DOWN");
            database.put("catalog", connection.getCatalog());
            database.put("productName", connection.getMetaData().getDatabaseProductName());
            database.put("productVersion", connection.getMetaData().getDatabaseProductVersion());
        } catch (Exception e) {
            log.error("Database health check failed", e);
            database.put("status", "DOWN");
            database.put("error", e.getMessage());
        }

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP".equals(database.get("status")) ? "UP" : "DEGRADED");
        health.put("uptimeSeconds", runtimeBean.getUptime() / 1000);
        health.put("availableProcessors", runtime.availableProcessors());
        health.put("memory", memory);
        health.put("database", database);
        health.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Kiểm tra sức khỏe hệ thống thành công", health));
    }
}
