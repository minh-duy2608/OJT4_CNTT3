package com.example.demo.config;

import com.example.demo.config.security.CustomAccessDeniedHandler;
import com.example.demo.config.security.JwtAuthenticationEntryPoint;
import com.example.demo.config.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        // Public Catalog Read-only Endpoints
                        .requestMatchers(
                                org.springframework.http.HttpMethod.GET,
                                "/categories", "/api/v1/categories",
                                "/categories/**", "/api/v1/categories/**",
                                "/brands", "/api/v1/brands",
                                "/brands/**", "/api/v1/brands/**",
                                "/products", "/api/v1/products",
                                "/products/**", "/api/v1/products/**",
                                "/shops", "/api/v1/shops",
                                "/shops/*", "/api/v1/shops/*",
                                "/shops/*/products", "/api/v1/shops/*/products",
                                "/shops/*/products/**", "/api/v1/shops/*/products/**",
                                "/shops/*/coupons", "/api/v1/shops/*/coupons",
                                "/shops/*/reviews", "/api/v1/shops/*/reviews",
                                "/shops/*/reviews/summary", "/api/v1/shops/*/reviews/summary"
                        ).permitAll()
                        .requestMatchers(
                                org.springframework.http.HttpMethod.HEAD,
                                "/categories", "/api/v1/categories",
                                "/categories/**", "/api/v1/categories/**",
                                "/brands", "/api/v1/brands",
                                "/brands/**", "/api/v1/brands/**",
                                "/products", "/api/v1/products",
                                "/products/**", "/api/v1/products/**",
                                "/shops/*/products", "/api/v1/shops/*/products",
                                "/shops/*/products/**", "/api/v1/shops/*/products/**",
                                "/shops/*/coupons", "/api/v1/shops/*/coupons",
                                "/shops/*/reviews", "/api/v1/shops/*/reviews",
                                "/shops/*/reviews/summary", "/api/v1/shops/*/reviews/summary"
                        ).permitAll()
                        // Public Authentication, Health, Public Config & Resource Endpoints
                        .requestMatchers(
                                "/health", "/api/v1/health",
                                "/config/public", "/api/v1/config/public",
                                "/auth/register", "/api/v1/auth/register",
                                "/auth/login", "/api/v1/auth/login",
                                "/auth/refresh", "/api/v1/auth/refresh",
                                "/auth/forgot-password", "/api/v1/auth/forgot-password",
                                "/auth/reset-password", "/api/v1/auth/reset-password",
                                "/auth/verify-email", "/api/v1/auth/verify-email",
                                "/auth/resend-verification", "/api/v1/auth/resend-verification",
                                "/uploads/**",
                                "/upload", "/api/v1/upload",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/error"
                        ).permitAll()
                        // Authenticated User Profile, Orders, Notifications, Reviews, Returns, Cart, Wishlist, Addresses, Coupons & Logout Endpoints
                        .requestMatchers(
                                "/me", "/api/v1/me",
                                "/auth/me", "/api/v1/auth/me",
                                "/auth/me/**", "/api/v1/auth/me/**",
                                "/auth/logout", "/api/v1/auth/logout",
                                "/cart", "/api/v1/cart",
                                "/cart/**", "/api/v1/cart/**",
                                "/orders", "/api/v1/orders",
                                "/orders/**", "/api/v1/orders/**",
                                "/notifications", "/api/v1/notifications",
                                "/notifications/**", "/api/v1/notifications/**",
                                "/returns/my", "/api/v1/returns/my",
                                "/returns/**", "/api/v1/returns/**",
                                "/reviews/**", "/api/v1/reviews/**",
                                "/wishlist", "/api/v1/wishlist",
                                "/wishlist/**", "/api/v1/wishlist/**",
                                "/addresses", "/api/v1/addresses",
                                "/addresses/**", "/api/v1/addresses/**",
                                "/coupons/validate", "/api/v1/coupons/validate"
                        ).authenticated()
                        // Inventory & Shop Management Endpoints
                        .requestMatchers(
                                "/shops/*/inventory", "/api/v1/shops/*/inventory",
                                "/shops/*/inventory/**", "/api/v1/shops/*/inventory/**",
                                "/shops/*/orders", "/api/v1/shops/*/orders",
                                "/shops/*/orders/**", "/api/v1/shops/*/orders/**"
                        ).hasAnyRole("ADMIN", "SHOP_MANAGER", "SHOP_OWNER")
                        // Admin Endpoints
                        .requestMatchers("/api/v1/admin/**", "/admin/**").hasAnyRole("ADMIN", "SHOP_MANAGER", "SHOP_OWNER")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
