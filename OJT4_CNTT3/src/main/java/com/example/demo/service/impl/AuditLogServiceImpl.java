package com.example.demo.service.impl;

import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.AuditLog;
import com.example.demo.entity.Role;
import com.example.demo.entity.ShopMemberStatus;
import com.example.demo.entity.User;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.AuditLogRepository;
import com.example.demo.repository.ShopMemberRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuditLogService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ShopMemberRepository shopMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String formatJsonDetails(String details) {
        if (details == null || details.trim().isEmpty()) {
            return "{}";
        }
        String trimmed = details.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                objectMapper.readTree(trimmed);
                return trimmed;
            } catch (Exception ignored) {
            }
        }
        try {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("message", details);
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{\"message\":\"" + details.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "") + "\"}";
        }
    }

    @Override
    @Transactional
    public void log(Long actorUserId, String action, String entityType, String entityId, Long shopId, String details, HttpServletRequest request) {
        String ipAddress = null;
        String userAgent = null;
        if (request != null) {
            ipAddress = request.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isBlank()) {
                ipAddress = request.getRemoteAddr();
            }
            userAgent = request.getHeader("User-Agent");
            if (userAgent != null && userAgent.length() > 500) {
                userAgent = userAgent.substring(0, 500);
            }
        }

        try {
            String jsonDetails = formatJsonDetails(details);
            AuditLog logEntry = AuditLog.builder()
                    .actorUserId(actorUserId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .shopId(shopId)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .details(jsonDetails)
                    .build();

            auditLogRepository.save(logEntry);
            log.info("[AUDIT] Action: {}, Entity: {} #{}, Shop: #{}, Actor: #{}", action, entityType, entityId, shopId, actorUserId);
        } catch (Exception e) {
            log.warn("[AUDIT] Không thể lưu audit log: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void log(Long actorUserId, String action, String entityType, String entityId, Long shopId, String details) {
        log(actorUserId, action, entityType, entityId, shopId, details, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAdminAuditLogs(String action, String entityType, Long shopId, int page, int size) {
        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<AuditLog> logPage = auditLogRepository.findAllByFilter(
                (action != null && !action.isBlank()) ? action : null,
                (entityType != null && !entityType.isBlank()) ? entityType : null,
                shopId,
                pageable
        );

        return PageResponse.<AuditLogResponse>builder()
                .content(logPage.getContent().stream().map(this::mapToResponse).toList())
                .page(logPage.getNumber())
                .size(logPage.getSize())
                .totalElements(logPage.getTotalElements())
                .totalPages(logPage.getTotalPages())
                .last(logPage.isLast())
                .first(logPage.isFirst())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLogResponse getAuditLogDetail(Long logId) {
        AuditLog auditLog = auditLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản ghi nhật ký #" + logId));
        return mapToResponse(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getShopAuditLogs(Long shopId, int page, int size, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN;
        boolean isOwner = shopRepository.findById(shopId)
                .map(s -> Objects.equals(s.getOwnerId(), user.getId()))
                .orElse(false);
        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);

        if (!isAdmin && !isOwner && !isMember) {
            throw new ForbiddenException("Bạn không có quyền xem nhật ký hoạt động của cửa hàng #" + shopId);
        }

        int p = Math.max(0, page);
        int s = size > 0 ? size : 15;
        Pageable pageable = PageRequest.of(p, s);

        Page<AuditLog> logPage = auditLogRepository.findByShopIdOrderByCreatedAtDesc(shopId, pageable);

        return PageResponse.<AuditLogResponse>builder()
                .content(logPage.getContent().stream().map(this::mapToResponse).toList())
                .page(logPage.getNumber())
                .size(logPage.getSize())
                .totalElements(logPage.getTotalElements())
                .totalPages(logPage.getTotalPages())
                .last(logPage.isLast())
                .first(logPage.isFirst())
                .build();
    }

    private AuditLogResponse mapToResponse(AuditLog a) {
        String actorUsername = null;
        String actorFullName = null;
        if (a.getActor() != null) {
            actorUsername = a.getActor().getUsername();
            actorFullName = a.getActor().getFullName();
        } else if (a.getActorUserId() != null) {
            User u = userRepository.findById(a.getActorUserId()).orElse(null);
            if (u != null) {
                actorUsername = u.getUsername();
                actorFullName = u.getFullName();
            }
        }

        String shopName = null;
        if (a.getShop() != null) {
            shopName = a.getShop().getName();
        } else if (a.getShopId() != null) {
            shopName = shopRepository.findById(a.getShopId()).map(com.example.demo.entity.Shop::getName).orElse(null);
        }

        String rawDetails = a.getDetails();
        String displayDetails = rawDetails;
        if (rawDetails != null && rawDetails.trim().startsWith("{")) {
            try {
                JsonNode node = objectMapper.readTree(rawDetails);
                if (node.has("message") && node.get("message").isTextual()) {
                    displayDetails = node.get("message").asText();
                }
            } catch (Exception ignored) {
            }
        }

        return AuditLogResponse.builder()
                .id(a.getId())
                .actorUserId(a.getActorUserId())
                .actorUsername(actorUsername)
                .actorFullName(actorFullName)
                .action(a.getAction())
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .shopId(a.getShopId())
                .shopName(shopName)
                .ipAddress(a.getIpAddress())
                .userAgent(a.getUserAgent())
                .details(displayDetails)
                .createdAt(a.getCreatedAt())
                .build();
    }
}

