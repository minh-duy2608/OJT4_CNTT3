package com.example.demo.repository;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT COUNT(DISTINCT u) FROM User u LEFT JOIN u.roles r " +
           "WHERE u.status = :status AND (" +
           "u.role = :roleAdmin OR u.role = :admin OR " +
           "r.code = 'ADMIN' OR r.code = 'ROLE_ADMIN')")
    long countActiveAdmins(
            @Param("status") UserStatus status,
            @Param("roleAdmin") Role roleAdmin,
            @Param("admin") Role admin
    );
}
