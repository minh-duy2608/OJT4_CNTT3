# Dự án OJT4 - Fullstack (Frontend & Backend & Database)

Dự án tích hợp đầy đủ hệ thống bao gồm:
- **Frontend**: Ứng dụng React + Vite (Shopping App) đóng gói qua Nginx.
- **Backend**: Spring Boot 4 / Java 21 REST API.
- **Database**: MySQL 8.0 với volume dữ liệu liên tục và script khởi tạo dữ liệu mẫu.
- **Quản lý DB**: PhpMyAdmin web UI.

---

## 🐳 KHỞI CHẠY DỰ ÁN BẰNG DOCKER COMPOSE

Tất cả các dịch vụ (Frontend, Backend, Database, PhpMyAdmin) được cấu hình tập trung tại file [docker-compose.yml](file:///c:/Users/acer/OJT4_CNTT3/docker-compose.yml) ở thư mục gốc.

### 1. Chuẩn bị file môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
*(Hoặc dùng trực tiếp file `.env` mặc định đã được tạo sẵn).*

### 2. Khởi chạy toàn bộ hệ thống
Tại thư mục gốc của dự án (`OJT4_CNTT3/`), chạy:
```bash
docker compose up -d --build
```

### 3. Danh sách dịch vụ & Cổng truy cập

#### 🖥️ Chạy LOCAL (máy tính cá nhân)
| Dịch vụ | Địa chỉ truy cập | Ghi chú |
|---|---|---|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Giao diện React Vite, Nginx reverse proxy `/api/` |
| **Backend API** | [http://localhost:8080](http://localhost:8080) | Spring Boot REST API (`/api/v1/...`) |
| **PhpMyAdmin** | [http://localhost:8085](http://localhost:8085) | Web UI quản lý MySQL (user: `root`, pass: `root_secure_password_123`) |
| **MySQL Database** | `localhost:3307` | User: `app_user` / `app_password_123`, DB: `app_db` (cổng 3307 tránh conflict local) |

#### 🌐 Chạy trên VPS (`165.101.46.54`)
| Dịch vụ | Địa chỉ truy cập | Ghi chú |
|---|---|---|
| **Frontend** | [http://165.101.46.54](http://165.101.46.54) | Giao diện React Vite, Nginx reverse proxy `/api/` |
| **Backend API** | [http://165.101.46.54:8080](http://165.101.46.54:8080) | Spring Boot REST API (`/api/v1/...`) |
| **PhpMyAdmin** | [http://165.101.46.54:8085](http://165.101.46.54:8085) | Web UI quản lý MySQL |
| **MySQL Database** | `165.101.46.54:3306` | User: `app_user` / `app_password_123`, DB: `app_db` |

### 4. Deploy lên VPS
```bash
# Bước 1: Trên máy local — đóng gói và upload lên VPS
tar -czf project.tar.gz --exclude='.git' --exclude='node_modules' \
  --exclude='.gradle' --exclude='build' --exclude='dist' \
  docker-compose.yml .env README.md OJT4_CNTT3 "Shopping App 2"
scp project.tar.gz root@165.101.46.54:/root/

# Bước 2: Trên VPS — giải nén và khởi động
ssh root@165.101.46.54
mkdir -p /root/app && tar -xzf /root/project.tar.gz -C /root/app
cd /root/app
docker compose up -d --build
```

### 5. Dừng hệ thống
- Dừng các container:
  ```bash
  docker compose down
  ```
- Dừng và xóa kèm volume dữ liệu (làm mới database):
  ```bash
  docker compose down -v
  ```
- Xem log các service:
  ```bash
  # Xem tất cả
  docker compose logs -f

  # Xem riêng backend hoặc frontend
  docker compose logs -f backend
  docker compose logs -f frontend
  ```

---

## 🚀 Tự động hóa CI/CD (GitHub Actions)

Dự án đã tích hợp pipeline CI/CD tại `.github/workflows/ci-cd.yml`:
1. **Kiểm tra tự động (CI):** Khi mở Pull Request hoặc push vào `main`, `develop`:
   - Backend: Tự động chạy Unit/Integration Tests & build `bootJar` với JDK 21.
   - Frontend: Tự động install dependencies và build Vite bundle.
2. **Triển khai tự động (CD):** Khi merge hoặc push vào nhánh `main`:
   - GitHub Actions tự động kết nối SSH đến VPS.
   - Kéo code mới nhất từ nhánh `main`.
   - Chạy `docker compose up -d --build` và dọn dẹp images cũ.

### Cấu hình GitHub Secrets cần thiết
Vào GitHub repository: **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:

| Secret Name | Giá trị mẫu | Mô tả |
| :--- | :--- | :--- |
| `VPS_HOST` | `165.101.46.54` | IP của VPS |
| `VPS_USERNAME` | `root` | User SSH |
| `VPS_PASSWORD` | `Mbmbjk12@` | Mật khẩu SSH (hoặc dùng `VPS_SSH_KEY`) |
| `VPS_PORT` | `22` | Cổng SSH (mặc định 22) |

