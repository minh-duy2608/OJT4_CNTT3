# Hướng Dẫn Tích Hợp & Vận Hành SonarQube và JaCoCo Code Coverage

Tài liệu này hướng dẫn chi tiết cách khởi chạy SonarQube, chạy kiểm thử, sinh báo cáo độ bao phủ mã nguồn (JaCoCo Coverage), và đẩy kết quả phân tích chất lượng mã nguồn lên SonarQube Dashboard cho dự án OJT4 E-Commerce.

---

## 1. Kiến Trúc & Công Nghệ Tích Hợp

* **Ngôn ngữ & Runtime:** Java 21 (Eclipse Temurin JDK 21).
* **Framework:** Spring Boot 4.1.2.
* **Build Tool:** Gradle 9.8.2 (Groovy DSL).
* **Coverage Tool:** JaCoCo `0.8.12` (sinh báo cáo XML & HTML tự động sau khi chạy test).
* **Sonar Plugin:** `org.sonarqube` version `5.1.0.4882`.
* **SonarQube Server:** SonarQube Community Edition `10-community` (chạy độc lập qua Docker Compose).
* **CI/CD:** GitHub Actions workflow `.github/workflows/sonar.yml`.

---

## 2. Khởi Động SonarQube Bằng Docker Compose

Dự án cung cấp file cấu hình `docker-compose.sonar.yml` độc lập, không làm ảnh hưởng đến môi trường ứng dụng và cơ sở dữ liệu chính:

```bash
# Khởi động dịch vụ SonarQube ở chế độ nền
docker compose -f docker-compose.sonar.yml up -d

# Kiểm tra trạng thái container
docker compose -f docker-compose.sonar.yml ps

# Xem log khởi động
docker compose -f docker-compose.sonar.yml logs -f sonarqube
```

* **URL Dashboard:** `http://localhost:9000`
* **Tài khoản mặc định:**
  * **Username:** `admin`
  * **Password:** `admin` (Hệ thống sẽ yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên).

---

## 3. Tạo Token Phân Tích Trên SonarQube Dashboard

1. Mở trình duyệt và truy cập: `http://localhost:9000`.
2. Đăng nhập với tài khoản `admin`.
3. Nhấp vào ảnh đại diện góc trên cùng bên phải -> chọn **My Account** -> chuyển sang tab **Security**.
4. Tại mục **Generate Token**:
   * **Name:** `ojt4-backend-token`
   * **Type:** `User Token` (hoặc `Project Analysis Token`)
   * **Expires in:** Chọn thời hạn mong muốn (e.g. 30 days hoặc No expiration cho dev).
   * Bấm **Generate** và copy chuỗi Token vừa tạo (ví dụ: `sqa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).

---

## 4. Chạy Kiểm Thử & Sinh Báo Cáo JaCoCo

Các tác vụ Gradle đã được cấu hình ràng buộc tự động: khi chạy `test`, tác vụ `jacocoTestReport` sẽ được kích hoạt để tạo báo cáo.

```bash
cd OJT4_CNTT3

# Chạy toàn bộ 152 Unit Tests và sinh báo cáo JaCoCo
./gradlew test jacocoTestReport --no-daemon
```

### Vị trí file báo cáo:
* **Báo cáo XML (SonarQube dùng):** `OJT4_CNTT3/build/reports/jacoco/test/jacocoTestReport.xml`
* **Báo cáo HTML trực quan (xem trên trình duyệt):** `OJT4_CNTT3/build/reports/jacoco/test/html/index.html`

Mở xem báo cáo HTML trên macOS:
```bash
open build/reports/jacoco/test/html/index.html
```

---

## 5. Thực Hiện Phân Tích SonarQube

Sau khi chạy test và có file `jacocoTestReport.xml`, chạy lệnh sau để quét và gửi kết quả lên SonarQube:

### Cách 1: Truyền Token trực tiếp qua dòng lệnh:
```bash
cd OJT4_CNTT3
./gradlew sonar \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=<YOUR_SONAR_TOKEN> \
  --no-daemon
```

### Cách 2: Thiết lập biến môi trường:
```bash
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=<YOUR_SONAR_TOKEN>

cd OJT4_CNTT3
./gradlew sonar --no-daemon
```

### Cách 3: Chạy toàn bộ quy trình chỉ trong 1 lệnh duy nhất:
```bash
cd OJT4_CNTT3
./gradlew test jacocoTestReport sonar \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=<YOUR_SONAR_TOKEN> \
  --no-daemon
```

---

## 6. Cấu Hình Loại Trừ (Exclusions) Cho Phân Tích Độ Bao Phủ

Để chỉ số Code Coverage phản ánh đúng logic nghiệp vụ của hệ thống và không bị làm loãng bởi boilerplate code, các gói và file sau đã được loại trừ khỏi tính toán coverage trong `build.gradle`:

1. `**/DemoApplication.java` - Điểm khởi chạy ứng dụng.
2. `**/config/**` - Cấu hình hệ thống (SecurityConfig, OpenApiConfig, WebMvcConfig,...).
3. `**/dto/**` - Data Transfer Objects (Request/Response DTOs, Builders, Getters/Setters).
4. `**/entity/**` - JPA Entities.
5. `**/exception/**` - Các lớp định nghĩa ngoại lệ tuỳ biến.
6. `**/event/**` - Spring Application Events.

Tập trung tính toán độ bao phủ chặt chẽ trên các tầng nghiệp vụ:
* `com.example.demo.service.impl.*` (Toàn bộ Business Services)
* `com.example.demo.controller.*` (Toàn bộ REST Controllers)
* `com.example.demo.repository.*` (Toàn bộ Data Access Repositories)

---

## 7. Tích Hợp CI/CD (GitHub Actions)

Dự án có sẵn workflow `.github/workflows/sonar.yml` tự động chạy mỗi khi có commit hoặc pull request.
Để kích hoạt bước quét SonarQube trên CI/CD, hãy cấu hình 2 secrets trên GitHub Repository:
* `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`:
  * `SONAR_HOST_URL`: URL máy chủ SonarQube của nhóm hoặc `https://sonarcloud.io`.
  * `SONAR_TOKEN`: Token xác thực SonarQube.
