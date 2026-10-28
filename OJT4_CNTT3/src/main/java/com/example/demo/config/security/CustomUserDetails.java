package com.example.demo.config.security;

import com.example.demo.entity.RoleEntity;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Getter
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final User user;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();
        if (user.getRole() != null) {
            String roleName = user.getRole().name();
            authorities.add(new SimpleGrantedAuthority(roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName));
        }
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            for (RoleEntity roleEntity : user.getRoles()) {
                String code = roleEntity.getCode();
                if (code != null && !code.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(code.startsWith("ROLE_") ? code : "ROLE_" + code));
                }
            }
        }
        return authorities.isEmpty()
                ? Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                : authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.getStatus() != UserStatus.LOCKED 
                && user.getStatus() != UserStatus.BLOCKED 
                && user.getStatus() != UserStatus.DELETED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.getStatus() != UserStatus.DELETED && user.getStatus() != UserStatus.INACTIVE;
    }
}
