package com.example.demo.dto.response;

import com.example.demo.entity.RoleEntity;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDetailResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private boolean isSystem;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<PermissionResponse> permissions = new ArrayList<>();

    public static RoleDetailResponse fromEntity(RoleEntity entity) {
        if (entity == null) return null;
        List<PermissionResponse> perms = entity.getPermissions() != null
                ? entity.getPermissions().stream()
                .map(PermissionResponse::fromEntity)
                .collect(Collectors.toList())
                : new ArrayList<>();

        return RoleDetailResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .isSystem(entity.isSystem())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .permissions(perms)
                .build();
    }
}
