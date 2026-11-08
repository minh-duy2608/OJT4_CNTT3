package com.example.demo.service.impl;

import com.example.demo.dto.request.AddShopMemberRequest;
import com.example.demo.dto.request.UpdateShopMemberRequest;
import com.example.demo.dto.response.ShopMemberResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.ShopMemberRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ShopMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShopMemberServiceImpl implements ShopMemberService {

    private final ShopMemberRepository shopMemberRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    private User verifyShopManagerOrAdmin(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác");
        }
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không hợp lệ"));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));
        if (isAdmin) {
            return user;
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        if (Objects.equals(shop.getOwnerId(), user.getId())) {
            return user;
        }

        boolean isMember = shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(shopId, user.getId(), ShopMemberStatus.ACTIVE);
        if (!isMember) {
            throw new ForbiddenException("Bạn không có quyền quản lý thành viên của cửa hàng này");
        }

        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopMemberResponse> getShopMembers(Long shopId, String currentUsername) {
        verifyShopManagerOrAdmin(shopId, currentUsername);

        List<ShopMember> members = shopMemberRepository.findByIdShopId(shopId);
        return members.stream().map(ShopMemberResponse::fromEntity).toList();
    }

    @Override
    @Transactional
    public ShopMemberResponse addShopMember(Long shopId, AddShopMemberRequest request, String currentUsername) {
        User currentUser = verifyShopManagerOrAdmin(shopId, currentUsername);
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        User targetUser = null;
        if (request.getUserId() != null) {
            targetUser = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng #" + request.getUserId()));
        } else if (request.getUsernameOrEmail() != null && !request.getUsernameOrEmail().isBlank()) {
            String identifier = request.getUsernameOrEmail().trim();
            targetUser = userRepository.findByUsername(identifier)
                    .or(() -> userRepository.findByEmail(identifier))
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng với thông tin: " + identifier));
        } else {
            throw new BadRequestException("Vui lòng cung cấp ID người dùng hoặc Username/Email");
        }

        if (Objects.equals(shop.getOwnerId(), targetUser.getId())) {
            throw new BadRequestException("Người dùng này đã là chủ sở hữu cửa hàng");
        }

        if (shopMemberRepository.existsByIdShopIdAndIdUserId(shopId, targetUser.getId())) {
            throw new BadRequestException("Người dùng đã là thành viên của cửa hàng này");
        }

        RoleEntity role = null;
        if (request.getRoleId() != null) {
            role = roleRepository.findById(request.getRoleId())
                    .orElse(null);
        }
        if (role == null && request.getRoleCode() != null && !request.getRoleCode().isBlank()) {
            role = roleRepository.findByCode(request.getRoleCode().trim().toUpperCase())
                    .orElse(null);
        }
        if (role == null) {
            role = roleRepository.findByCode("SHOP_MANAGER")
                    .or(() -> roleRepository.findAll().stream().findFirst())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vai trò hợp lệ trong hệ thống"));
        }

        ShopMember member = ShopMember.builder()
                .id(new ShopMemberId(shopId, targetUser.getId()))
                .shop(shop)
                .user(targetUser)
                .roleId(role.getId())
                .role(role)
                .status(ShopMemberStatus.ACTIVE)
                .invitedBy(currentUser.getId())
                .joinedAt(LocalDateTime.now())
                .build();

        ShopMember saved = shopMemberRepository.save(member);
        log.info("User {} added user {} as member to shop #{}", currentUsername, targetUser.getUsername(), shopId);
        return ShopMemberResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ShopMemberResponse updateShopMember(Long shopId, Long memberId, UpdateShopMemberRequest request, String currentUsername) {
        verifyShopManagerOrAdmin(shopId, currentUsername);

        ShopMember member = shopMemberRepository.findByIdShopIdAndIdUserId(shopId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên #" + memberId + " trong cửa hàng #" + shopId));

        if (request.getStatus() != null) {
            member.setStatus(request.getStatus());
        }

        if (request.getRoleId() != null) {
            RoleEntity role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vai trò #" + request.getRoleId()));
            member.setRoleId(role.getId());
            member.setRole(role);
        } else if (request.getRoleCode() != null && !request.getRoleCode().isBlank()) {
            RoleEntity role = roleRepository.findByCode(request.getRoleCode().trim().toUpperCase())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy vai trò có mã: " + request.getRoleCode()));
            member.setRoleId(role.getId());
            member.setRole(role);
        }

        ShopMember updated = shopMemberRepository.save(member);
        log.info("User {} updated member #{} in shop #{}", currentUsername, memberId, shopId);
        return ShopMemberResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteShopMember(Long shopId, Long memberId, String currentUsername) {
        verifyShopManagerOrAdmin(shopId, currentUsername);

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        if (Objects.equals(shop.getOwnerId(), memberId)) {
            throw new BadRequestException("Không thể xóa chủ sở hữu khỏi cửa hàng");
        }

        if (!shopMemberRepository.existsByIdShopIdAndIdUserId(shopId, memberId)) {
            throw new ResourceNotFoundException("Không tìm thấy thành viên #" + memberId + " trong cửa hàng #" + shopId);
        }

        shopMemberRepository.deleteByIdShopIdAndIdUserId(shopId, memberId);
        log.info("User {} deleted member #{} from shop #{}", currentUsername, memberId, shopId);
    }
}
