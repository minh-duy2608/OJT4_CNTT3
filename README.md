# Dự án OJT4_CNTT3 (Spring Boot & MySQL)

Dự án mẫu Backend được xây dựng bằng Java 21 và Spring Boot.

---

## 📚 TÀI LIỆU DỰ ÁN

- [Tài liệu Quy ước viết mã (Coding Conventions)](file:///c:/Users/acer/OJT4_CNTT3/docs/CODING_CONVENTIONS.md)
- [Tài liệu Quy ước Git & Commit (Git Conventions)](file:///c:/Users/acer/OJT4_CNTT3/docs/GIT_CONVENTIONS.md)
- [Danh sách kịch bản kiểm thử (Test Cases)](file:///c:/Users/acer/OJT4_CNTT3/docs/TEST_CASES.md)
- [Hướng dẫn cấu trúc thư mục kiểm thử (Test Structure)](file:///c:/Users/acer/OJT4_CNTT3/src/test/java/com/example/demo/README.md)

---

## 🐳 KHỞI CHẠY DATABASE BẰNG DOCKER COMPOSE

### 1. Chuẩn bị file môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```

### 2. Khởi chạy MySQL và PhpMyAdmin
Chạy lệnh sau để tải và khởi động các container ở chế độ chạy nền (background):
```bash
docker compose up -d
```

### 3. Thông tin kết nối mặc định:
- **MySQL Server**:
  - Host: `localhost`
  - Port: `3306`
  - Database: `app_db`
  - Username: `app_user`
  - Password: `app_password_123`
  - Root Password: `root_secure_password_123`
- **PhpMyAdmin UI**:
  - Truy cập: `http://localhost:8085`
  - Đăng nhập bằng tài khoản `root` và mật khẩu root tương ứng.
- **Dữ liệu mẫu**:
  - File khởi tạo dữ liệu tự động đặt tại [01-init.sql](file:///c:/Users/acer/OJT4_CNTT3/docker/mysql/init/01-init.sql) và sẽ được nạp khi container khởi tạo lần đầu.

### 4. Dừng dịch vụ
```bash
docker compose down
# Hoặc dừng và xóa luôn volume dữ liệu:
docker compose down -v
```

---

## 🧪 CHẠY KIỂM THỬ (TESTING)

Chạy toàn bộ các bài test với Gradle:
```bash
./gradlew test
```
Cấu hình test riêng biệt được đặt tại [application-test.properties](file:///c:/Users/acer/OJT4_CNTT3/src/test/resources/application-test.properties).
