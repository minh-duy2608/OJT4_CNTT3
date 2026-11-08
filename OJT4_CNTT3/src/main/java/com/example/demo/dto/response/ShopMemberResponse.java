package com.example.demo.dto.response;

import com.example.demo.entity.ShopMember;
import com.example.demo.entity.ShopMemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopMemberResponse {
    private Long shopId;
    private Long userId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private Long roleId;
    private String roleCode;
    private String roleName;
    private ShopMemberStatus status;
    private Long invitedBy;
    private String invitedByName;
    private LocalDateTime joinedAt;

    public static ShopMemberResponse fromEntity(ShopMember member) {
        if (member == null) return null;
        return ShopMemberResponse.builder()
                .shopId(member.getId() != null ? member.getId().getShopId() : null)
                .userId(member.getUser() != null ? member.getUser().getId() : (member.getId() != null ? member.getId().getUserId() : null))
                .username(member.getUser() != null ? member.getUser().getUsername() : null)
                .fullName(member.getUser() != null ? member.getUser().getFullName() : null)
                .email(member.getUser() != null ? member.getUser().getEmail() : null)
                .phone(member.getUser() != null ? member.getUser().getPhone() : null)
                .avatarUrl(member.getUser() != null ? member.getUser().getAvatarUrl() : null)
                .roleId(member.getRoleId())
                .roleCode(member.getRole() != null ? member.getRole().getCode() : null)
                .roleName(member.getRole() != null ? member.getRole().getName() : null)
                .status(member.getStatus())
                .invitedBy(member.getInvitedBy())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
