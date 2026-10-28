package com.example.demo.dto.response;

import com.example.demo.entity.PermissionEntity;
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
public class PermissionResponse {

    private Long id;
    private String code;
    private String name;
    private String description;

    public static PermissionResponse fromEntity(PermissionEntity entity) {
        if (entity == null) return null;
        return PermissionResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .build();
    }
}
