# DANH SÁCH KỊCH BẢN KIỂM THỬ (TEST CASES) & ĐẶC TẢ 11 API AUTH
Giai đoạn: **Khởi tạo & Nền tảng (Phase 1)** | Dự án: **OJT4_CNTT3**
Kiến trúc định hướng: **Microservice Architecture (Identity & Access Management - IAM)**

---

## 1. TỔNG QUAN PHÂN LOẠI TEST CASES

| Nhóm kịch bản | Mô tả | Mã định danh | Phạm vi kiểm thử |
| :--- | :--- | :--- | :--- |
| **Nhóm 1: Authentication & Authorization** | 11 API xác thực, phân quyền, quản lý phiên làm việc & vòng đời Token | `TC-AUTH-*` | Controller + Service + Security + Tokens |
| **Nhóm 2: CRUD & Nghiệp vụ cơ bản** | Thao tác thêm, sửa, xóa, xem chi tiết và phân trang danh sách dữ liệu | `TC-CRUD-*` | Controller + Service + Repository |
| **Nhóm 3: Dữ liệu đầu vào & Validation** | Kiểm tra ràng buộc định dạng dữ liệu, email, mật khẩu, chống SQL Injection/XSS | `TC-VAL-*` | DTO Validation (`@Valid`) |
| **Nhóm 4: Kết nối Database & Xử lý lỗi** | Kết nối DB, Transaction Rollback khi lỗi, định dạng JSON lỗi chuẩn RESTful | `TC-ERR-*` | Global Exception Handler + DB |

---

## 2. BẢNG TỔNG HỢP 11 API AUTHENTICATION (CHUẨN MICROSERVICE)

Hệ thống hỗ trợ song song 2 định dạng đường dẫn qua API Gateway:
- Chuẩn Microservice: `/auth/**`
- Chuẩn API Gateway Versioned: `/api/v1/auth/**`

| STT | Method | Endpoint | Chức năng | Quyền truy cập |
| :---: | :---: | :--- | :--- | :--- |
| **1** | `POST` | `/auth/register` | Đăng ký tài khoản khách hàng | **Public** |
| **2** | `POST` | `/auth/login` | Đăng nhập, cấp JWT Access Token & Refresh Token | **Public** |
| **3** | `POST` | `/auth/refresh` | Làm mới access token bằng refresh token (kèm Rotation) | **Public / Token hợp lệ** |
| **4** | `POST` | `/auth/logout` | Đăng xuất, thu hồi refresh token phiên làm việc | **Authenticated** |
| **5** | `GET` | `/auth/me` | Lấy thông tin tài khoản hiện tại | **Authenticated** |
| **6** | `PATCH` | `/auth/me` | Cập nhật thông tin cá nhân (hồ sơ) | **Authenticated** |
| **7** | `PATCH` | `/auth/me/password` | Đổi mật khẩu tài khoản hiện tại | **Authenticated** |
| **8** | `POST` | `/auth/forgot-password` | Yêu cầu khôi phục mật khẩu qua email | **Public** |
| **9** | `POST` | `/auth/reset-password` | Đặt lại mật khẩu bằng token hợp lệ | **Public** |
| **10** | `POST` | `/auth/verify-email` | Xác minh email bằng mã token | **Public** |
| **11** | `POST` | `/auth/resend-verification` | Gửi lại email xác minh | **Public** |

---

## 3. CHI TIẾT DANH SÁCH TEST CASES CHO 11 API AUTH

### `TC-AUTH-01`: Đăng ký tài khoản khách hàng thành công (API 1 - POST /auth/register)
- **Mục tiêu**: Đảm bảo khách hàng có thể đăng ký tài khoản mới khi cung cấp thông tin hợp lệ.
- **Quyền**: Public.
- **Tiền điều kiện**: Email và username chưa tồn tại trong hệ thống.
- **Dữ liệu đầu vào**:
  ```json
  {
    "username": "nguyenvan_a",
    "email": "vana@example.com",
    "password": "SecurePassword123!",
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678"
  }
  ```
- **Các bước thực hiện**:
  1. Gửi request `POST /auth/register` (hoặc `POST /api/v1/auth/register`).
- **Kết quả kỳ vọng**:
  - HTTP Status: `201 Created`.
  - Response body chứa `code: 201`, `success: true`.
  - Mật khẩu lưu trong Database được băm bằng BCrypt (cột `password_hash`).
  - Gán vai trò mặc định khách hàng `ROLE_USER`.
  - Tự động sinh `EmailVerificationToken` và bắn Domain Event `UserRegisteredEvent`.

---

### `TC-AUTH-02`: Đăng ký thất bại do trùng lặp email hoặc username
- **Mục tiêu**: Chống trùng lặp danh tính người dùng.
- **Tiền điều kiện**: Email `vana@example.com` đã tồn tại trong DB.
- **Kết quả kỳ vọng**:
  - HTTP Status: `409 Conflict`.
  - Body: `code: 409`, `message: "Email already registered"` (hoặc `"Username already exists"`).

---

### `TC-AUTH-03`: Đăng nhập thành công cấp JWT và Refresh Token (API 2 - POST /auth/login)
- **Mục tiêu**: Đăng nhập bằng username/email và mật khẩu chính xác.
- **Quyền**: Public.
- **Dữ liệu đầu vào**:
  ```json
  {
    "username": "nguyenvan_a",
    "password": "SecurePassword123!"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Trả về `accessToken` (JWT), `refreshToken` (UUID token), `tokenType: "Bearer"`, `expiresIn: 86400000`, `user`.
  - Cập nhật thời điểm `last_login_at` trong database.
  - Lưu bản ghi refresh token vào bảng `refresh_tokens`.

---

### `TC-AUTH-04`: Đăng nhập thất bại do sai mật khẩu hoặc tài khoản bị khóa
- **Mục tiêu**: Từ chối truy cập khi sai thông tin hoặc tài khoản bị khóa (`LOCKED` / `BLOCKED`).
- **Kết quả kỳ vọng**:
  - HTTP Status: `401 Unauthorized`.
  - Thông báo lỗi chung: `Invalid username or password`.

---

### `TC-AUTH-05`: Làm mới access token bằng refresh token hợp lệ (API 3 - POST /auth/refresh)
- **Mục tiêu**: Cấp access token mới mà không cần người dùng nhập lại mật khẩu.
- **Quyền**: Public / Token hợp lệ.
- **Dữ liệu đầu vào**:
  ```json
  {
    "refreshToken": "valid-refresh-token-uuid"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Trả về `accessToken` mới và `refreshToken` mới (cơ chế Token Rotation).
  - Refresh token cũ được đánh dấu `revoked = true` để chống replay attack.

---

### `TC-AUTH-06`: Làm mới thất bại khi refresh token bị thu hồi hoặc hết hạn
- **Dữ liệu đầu vào**: `{ "refreshToken": "revoked-or-expired-token" }`
- **Kết quả kỳ vọng**:
  - HTTP Status: `401 Unauthorized`.
  - Message: `Refresh token đã bị thu hồi` hoặc `Refresh token đã hết hạn, vui lòng đăng nhập lại`.

---

### `TC-AUTH-07`: Đăng xuất thu hồi Refresh Token (API 4 - POST /auth/logout)
- **Mục tiêu**: Vô hiệu hóa phiên làm việc khi người dùng đăng xuất.
- **Quyền**: Authenticated (Header `Authorization: Bearer <access_token>`).
- **Dữ liệu đầu vào (Tùy chọn)**:
  ```json
  {
    "refreshToken": "current-refresh-token"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Refresh token tương ứng (hoặc toàn bộ token của user) chuyển thành `revoked = true`.
  - `SecurityContext` được dọn sạch.

---

### `TC-AUTH-08`: Lấy thông tin tài khoản hiện tại (API 5 - GET /auth/me)
- **Mục tiêu**: Lấy thông tin hồ sơ của tài khoản đang đăng nhập từ access token.
- **Quyền**: Authenticated.
- **Header**: `Authorization: Bearer <access_token>`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Response chứa `id`, `username`, `email`, `fullName`, `phone`, `avatarUrl`, `role`, `status`, `emailVerifiedAt`, `createdAt`.
  - Không để lộ mật khẩu (`password_hash`).

---

### `TC-AUTH-09`: Cập nhật thông tin cá nhân (API 6 - PATCH /auth/me)
- **Mục tiêu**: Cho phép người dùng cập nhật họ tên, số điện thoại, avatar.
- **Quyền**: Authenticated.
- **Dữ liệu đầu vào**:
  ```json
  {
    "fullName": "Nguyễn Văn A Cập Nhật",
    "phone": "0987654321",
    "avatarUrl": "https://example.com/new-avatar.png"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Thông tin mới được lưu vào database, `updated_at` được làm mới.
  - Không cho phép tự ý đổi `id`, `username`, `email`, `role` tại endpoint này.

---

### `TC-AUTH-10`: Đổi mật khẩu tài khoản thành công (API 7 - PATCH /auth/me/password)
- **Mục tiêu**: Cho phép người dùng đổi mật khẩu khi cung cấp đúng mật khẩu hiện tại.
- **Quyền**: Authenticated.
- **Dữ liệu đầu vào**:
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Mật khẩu mới được băm BCrypt và lưu vào DB.
  - Toàn bộ refresh token cũ của user bị thu hồi (buộc đăng nhập lại trên các thiết bị khác).

---

### `TC-AUTH-11`: Đổi mật khẩu thất bại do sai mật khẩu cũ hoặc không khớp xác nhận
- **Kịch bản 1**: `currentPassword` sai -> HTTP `400 Bad Request` (`Mật khẩu hiện tại không chính xác`).
- **Kịch bản 2**: `newPassword` trùng `currentPassword` -> HTTP `400 Bad Request` (`Mật khẩu mới không được trùng với mật khẩu cũ`).
- **Kịch bản 3**: `newPassword` khác `confirmPassword` -> HTTP `400 Bad Request` (`Xác nhận mật khẩu mới không khớp`).

---

### `TC-AUTH-12`: Yêu cầu khôi phục mật khẩu qua email (API 8 - POST /auth/forgot-password)
- **Mục tiêu**: Tiếp nhận yêu cầu quên mật khẩu và tạo token khôi phục.
- **Quyền**: Public.
- **Dữ liệu đầu vào**:
  ```json
  {
    "email": "vana@example.com"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Tạo bản ghi mới trong `password_reset_tokens` (thời hạn 15 phút).
  - Vô hiệu hóa các reset token cũ chưa dùng.
  - Bắn Domain Event `PasswordResetRequestedEvent` để microservice email xử lý gửi thư.

---

### `TC-AUTH-13`: Đặt lại mật khẩu bằng token hợp lệ (API 9 - POST /auth/reset-password)
- **Mục tiêu**: Cho phép đặt mật khẩu mới khi có reset token hợp lệ gửi từ email.
- **Quyền**: Public.
- **Dữ liệu đầu vào**:
  ```json
  {
    "token": "valid-password-reset-token-uuid",
    "newPassword": "NewResetPassword789!",
    "confirmPassword": "NewResetPassword789!"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Cập nhật mật khẩu mới cho tài khoản.
  - Đánh dấu token đã sử dụng (`used = true`).
  - Thu hồi toàn bộ refresh token cũ của tài khoản.

---

### `TC-AUTH-14`: Đặt lại mật khẩu thất bại khi token hết hạn hoặc đã sử dụng
- **Dữ liệu đầu vào**: Token giả mạo hoặc đã qua 15 phút.
- **Kết quả kỳ vọng**:
  - HTTP Status: `400 Bad Request`.
  - Message: `Mã token khôi phục mật khẩu không hợp lệ` hoặc `đã hết hạn`.

---

### `TC-AUTH-15`: Xác minh email thành công (API 10 - POST /auth/verify-email)
- **Mục tiêu**: Kích hoạt trạng thái email đã xác minh bằng token.
- **Quyền**: Public.
- **Dữ liệu đầu vào**:
  ```json
  {
    "token": "valid-email-verification-token-uuid"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Cập nhật trường `email_verified_at = CURRENT_TIMESTAMP`.
  - Nếu tài khoản ở trạng thái `PENDING`, tự động chuyển thành `ACTIVE`.
  - Đánh dấu token đã sử dụng (`used = true`).

---

### `TC-AUTH-16`: Gửi lại email xác minh (API 11 - POST /auth/resend-verification)
- **Mục tiêu**: Cho phép gửi lại mã xác minh mới cho tài khoản chưa xác minh email.
- **Quyền**: Public.
- **Dữ liệu đầu vào**:
  ```json
  {
    "email": "vana@example.com"
  }
  ```
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Tạo token xác minh mới trong `email_verification_tokens`.
  - Bắn Domain Event `EmailVerificationRequestedEvent`.
  - Nếu email đã được xác minh trước đó, trả về thông báo rõ ràng.

---

### `TC-AUTH-17`: Truy cập API bảo mật không truyền Header Authorization
- **Mục tiêu**: Chặn các request chưa xác thực vào endpoint được bảo vệ (`/auth/me`, `/auth/logout`,...).
- **Các bước thực hiện**:
  1. Gửi request `GET /auth/me` không kèm header `Authorization`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `401 Unauthorized`.
  - Không truy cập được tài nguyên.

---

### `TC-AUTH-18`: Phân quyền RBAC (Role-Based Access Control)
- **Mục tiêu**: Chặn người dùng có vai trò `ROLE_USER` / `CLIENT` truy cập các tài nguyên quản trị viên `ROLE_ADMIN`.
- **Các bước thực hiện**:
  1. Gửi request `DELETE /api/v1/admin/users/1` kèm Bearer token của User thông thường.
- **Kết quả kỳ vọng**:
  - HTTP Status: `403 Forbidden`.
  - Message: `Access Denied / Insufficient Permissions`.

---

## 4. VALIDATION VÀ XỬ LÝ LỖI HỆ THỐNG

### `TC-VAL-01`: Bỏ trống các trường bắt buộc
- **Dữ liệu đầu vào**: `{ "username": "", "email": "invalid-email", "password": "" }`
- **Kết quả kỳ vọng**: HTTP `400 Bad Request`, body trả về danh sách chi tiết các field vi phạm.

### `TC-VAL-02`: Định dạng mật khẩu và số điện thoại
- Ràng buộc mật khẩu tối thiểu 6 ký tự.
- Ràng buộc số điện thoại theo định dạng chuẩn Việt Nam (10 chữ số).

### `TC-ERR-01`: Transaction Rollback khi lỗi giữa chừng
- Đảm bảo cơ chế `@Transactional` khôi phục trạng thái DB nếu có lỗi bất ngờ khi cập nhật token hoặc mật khẩu.
