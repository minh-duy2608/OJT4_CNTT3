package com.example.demo.dto.response;

import com.example.demo.entity.RoleEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private boolean isSystem;
    private boolean isPrimary;

    public static RoleResponse fromEntity(RoleEntity entity, boolean isPrimary) {
        if (entity == null) return null;
        return RoleResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .isSystem(entity.isSystem())
                .isPrimary(isPrimary)
                .build();
    }

    public static RoleResponse fromCode(String code, String name, String description, boolean isPrimary) {
        return RoleResponse.builder()
                .code(code)
                .name(name != null ? name : code)
                .description(description)
                .isSystem(true)
                .isPrimary(isPrimary)
                .build();
    }
}
