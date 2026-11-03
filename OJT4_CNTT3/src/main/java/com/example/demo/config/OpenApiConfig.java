package com.example.demo.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "OJT4 E-Commerce RESTful API Specification",
                version = "1.0.0",
                description = "Hệ thống tài liệu & thử nghiệm trực quan toàn bộ API Sàn Thương mại điện tử OJT4_CNTT3. " +
                        "Bao gồm các phân hệ: Xác thực (Auth/IAM), Quản trị hệ thống (Admin Portal), Quản lý người bán (Shop & Inventory), " +
                        "Danh mục & Sản phẩm đa biến thể (Catalog), Giỏ hàng (Cart), Đặt hàng (Orders), Sổ địa chỉ (Address), " +
                        "Danh sách yêu thích (Wishlist), Mã giảm giá (Coupons) và Upload tập tin.",
                contact = @Contact(
                        name = "OJT4 CNTT3 Development Team",
                        email = "son666727@gmail.com"
                ),
                license = @License(
                        name = "Apache 2.0",
                        url = "https://www.apache.org/licenses/LICENSE-2.0"
                )
        ),
        servers = {
                @Server(url = "/", description = "Cổng mặc định qua Reverse Proxy"),
                @Server(url = "http://localhost:8080", description = "Máy chủ Localhost Development"),
                @Server(url = "http://165.101.46.54:8080", description = "Máy chủ VPS Production Deployment")
        },
        security = {
                @SecurityRequirement(name = "Bearer Authentication")
        }
)
@SecurityScheme(
        name = "Bearer Authentication",
        description = "Nhập JWT Access Token nhận được từ API Đăng nhập `/api/v1/auth/login` (Không cần gõ tiền tố 'Bearer ')",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
public class OpenApiConfig {
}
