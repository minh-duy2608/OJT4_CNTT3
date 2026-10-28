# DANH SÁCH KỊCH BẢN TEST CASE (TEST CASES) CƠ BẢN
Giai đoạn: **Khởi tạo & Nền tảng (Phase 1)** | Dự án: **OJT4_CNTT3**

---

## 1. TỔNG QUAN PHÂN LOẠI TEST CASES

| Nhóm kịch bản | Mô tả | Mã định danh | Phạm vi kiểm thử |
| :--- | :--- | :--- | :--- |
| **Nhóm 1: Authentication & Authorization** | Đăng ký, đăng nhập, xác thực Token JWT, kiểm tra phân quyền người dùng | `TC-AUTH-*` | Controller + Service + Security |
| **Nhóm 2: CRUD & Nghiệp vụ cơ bản** | Thao tác thêm, sửa, xóa, xem chi tiết và phân trang danh sách dữ liệu | `TC-CRUD-*` | Controller + Service + Repository |
| **Nhóm 3: Dữ liệu đầu vào & Validation** | Kiểm tra ràng buộc định dạng dữ liệu, email, mật khẩu, chống SQL Injection/XSS | `TC-VAL-*` | DTO Validation (`@Valid`) |
| **Nhóm 4: Kết nối Database & Xử lý lỗi** | Kết nối DB, Transaction Rollback khi lỗi, định dạng JSON lỗi chuẩn RESTful | `TC-ERR-*` | Global Exception Handler + DB |

---

## 2. CHI TIẾT DANH SÁCH KỊCH BẢN TEST CASES

### PHẦN 1: AUTHENTICATION & AUTHORIZATION (XÁC THỰC & PHÂN QUYỀN)

#### `TC-AUTH-01`: Đăng ký tài khoản mới thành công với dữ liệu hợp lệ
- **Mục tiêu**: Đảm bảo người dùng có thể tạo tài khoản mới khi cung cấp thông tin hợp lệ.
- **Tiền điều kiện**: Email và username chưa tồn tại trong hệ thống.
- **Dữ liệu đầu vào**:
  ```json
  {
    "username": "nguyenvan_a",
    "email": "vana@example.com",
    "password": "SecurePassword123!",
    "fullName": "Nguyễn Văn A"
  }
  ```
- **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/register` với payload trên.
- **Kết quả kỳ vọng**:
  - HTTP Status: `201 Created` (hoặc `200 OK`).
  - Response body chứa thông tin tài khoản (trừ trường `password`).
  - Mật khẩu trong Database được băm bằng BCrypt (không lưu plain-text).
  - Trạng thái tài khoản là `ACTIVE`.

---

#### `TC-AUTH-02`: Đăng ký thất bại do trùng lặp email hoặc username
- **Mục tiêu**: Ngăn chặn tạo tài khoản trùng email/username.
- **Tiền điều kiện**: Email `vana@example.com` đã tồn tại trong DB.
- **Dữ liệu đầu vào**: Cùng email với tài khoản đã có sẵn.
- **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/register` với email đã tồn tại.
- **Kết quả kỳ vọng**:
  - HTTP Status: `409 Conflict` hoặc `400 Bad Request`.
  - Body trả về mã lỗi rõ ràng: `Email already registered`. Không tạo thêm bản ghi trong DB.

---

#### `TC-AUTH-03`: Đăng nhập thành công trả về JWT Token
- **Mục tiêu**: Người dùng đăng nhập đúng tài khoản và nhận được access token.
- **Tiền điều kiện**: Tài khoản `nguyenvan_a` đã được kích hoạt.
- **Dữ liệu đầu vào**:
  ```json
  {
    "username": "nguyenvan_a",
    "password": "SecurePassword123!"
  }
  ```
- **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/login`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Response body chứa `accessToken`, `tokenType: "Bearer"`, và thời gian hết hạn (`expiresIn`).

---

#### `TC-AUTH-04`: Đăng nhập thất bại do sai mật khẩu
- **Mục tiêu**: Hệ thống từ chối xác thực khi mật khẩu không đúng.
- **Dữ liệu đầu vào**: `username: "nguyenvan_a"`, `password: "WrongPassword"`
- **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/login`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `401 Unauthorized`.
  - Thông báo lỗi chung: `Invalid username or password` (không tiết lộ là sai username hay sai password vì lý do bảo mật).

---

#### `TC-AUTH-05`: Truy cập API bảo mật không truyền Header Authorization
- **Mục tiêu**: Chặn các request chưa xác thực vào endpoint được bảo vệ.
- **Các bước thực hiện**:
  1. Gửi request `GET /api/v1/users/me` không kèm header `Authorization`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `401 Unauthorized`.
  - Không truy cập được tài nguyên.

---

#### `TC-AUTH-06`: Truy cập tài nguyên Admin bằng quyền User thông thường
- **Mục tiêu**: Kiểm tra cơ chế Role-Based Access Control (RBAC).
- **Tiền điều kiện**: Token thuộc tài khoản có vai trò `ROLE_USER`.
- **Các bước thực hiện**:
  1. Gửi request `DELETE /api/v1/admin/users/1` kèm header `Authorization: Bearer <user_token>`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `403 Forbidden`.
  - Thông báo lỗi: `Access Denied / Insufficient Permissions`.

---

### PHẦN 2: CRUD & NGHIỆP VỤ CƠ BẢN (DATA MANAGEMENT)

#### `TC-CRUD-01`: Lấy danh sách tài nguyên có phân trang và sắp xếp (Pagination & Sorting)
- **Mục tiêu**: Đảm bảo API phân trang hoạt động chính xác, không tải toàn bộ DB vào RAM.
- **Các bước thực hiện**:
  1. Gửi request `GET /api/v1/users?page=0&size=10&sortBy=createdAt&sortDir=desc`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Response chứa các trường phân trang: `content` (mảng tối đa 10 phần tử), `pageNo: 0`, `pageSize: 10`, `totalElements`, `totalPages`, `last: boolean`.

---

#### `TC-CRUD-02`: Lấy chi tiết bản ghi theo ID hợp lệ
- **Các bước thực hiện**:
  1. Gửi request `GET /api/v1/users/{valid_id}`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Dữ liệu trả về đúng với ID yêu cầu.

---

#### `TC-CRUD-03`: Lấy chi tiết bản ghi với ID không tồn tại
- **Các bước thực hiện**:
  1. Gửi request `GET /api/v1/users/99999999`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `404 Not Found`.
  - Response theo format chuẩn: `message: "User not found with id: 99999999"`.

---

#### `TC-CRUD-04`: Cập nhật thông tin bản ghi thành công
- **Các bước thực hiện**:
  1. Gửi request `PUT /api/v1/users/{id}` kèm payload cập nhật thông tin (ví dụ: `fullName: "Nguyễn Văn B"`).
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK`.
  - Bản ghi trong Database được cập nhật và trường `updated_at` được thay đổi theo thời gian hiện tại.

---

#### `TC-CRUD-05`: Xóa bản ghi thành công (Soft Delete hoặc Hard Delete)
- **Các bước thực hiện**:
  1. Gửi request `DELETE /api/v1/users/{id}`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `200 OK` hoặc `204 No Content`.
  - Bản ghi không còn tồn tại khi truy vấn lại hoặc trạng thái chuyển thành `DELETED` / `INACTIVE`.

---

### PHẦN 3: VALIDATION & AN TOÀN DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION)

#### `TC-VAL-01`: Bỏ trống các trường bắt buộc (Empty / Blank fields)
- **Dữ liệu đầu vào**: `{ "username": "", "email": " " }`
- **Các bước thực hiện**:
  1. Gửi request `POST /api/v1/auth/register`.
- **Kết quả kỳ vọng**:
  - HTTP Status: `400 Bad Request`.
  - Trả về danh sách chi tiết các field vi phạm:
    ```json
    {
      "errors": {
        "username": "Username không được để trống",
        "email": "Email không được để trống"
      }
    }
    ```

---

#### `TC-VAL-02`: Định dạng email không hợp lệ
- **Dữ liệu đầu vào**: `{ "email": "invalid-email-format" }`
- **Kết quả kỳ vọng**:
  - HTTP Status: `400 Bad Request`.
  - Báo lỗi: `Email không đúng định dạng`.

---

#### `TC-VAL-03`: Độ dài mật khẩu không đáp ứng yêu cầu chính sách bảo mật
- **Dữ liệu đầu vào**: `{ "password": "123" }` (yêu cầu tối thiểu 8 ký tự, có ký tự in hoa, số và ký tự đặc biệt).
- **Kết quả kỳ vọng**:
  - HTTP Status: `400 Bad Request`.
  - Báo lỗi: `Password phải có từ 8 ký tự trở lên bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt`.

---

### PHẦN 4: DATABASE TRANSACTIONS & SYSTEM ERROR HANDLING

#### `TC-ERR-01`: Transaction Rollback khi xảy ra Exception giữa chừng
- **Mục tiêu**: Đảm bảo tính toàn vẹn dữ liệu (ACID) khi một nghiệp vụ ghi vào nhiều bảng bị lỗi ở bước cuối.
- **Kịch bản**: Tạo đơn hàng -> lưu Order thành công -> lỗi khi lưu OrderItem -> hệ thống kích hoạt rollback.
- **Kết quả kỳ vọng**:
  - Không có dữ liệu rác nào của Order được lưu lại trong DB.

#### `TC-ERR-02`: Xử lý lỗi Database Connection Timeout
- **Mục tiêu**: Hệ thống không bị treo hoặc crash khi Database tạm thời ngắt kết nối.
- **Kết quả kỳ vọng**:
  - HTTP Status: `500 Internal Server Error` hoặc `503 Service Unavailable`.
  - Trả về JSON lỗi thân thiện, ghi log chi tiết phía server.
