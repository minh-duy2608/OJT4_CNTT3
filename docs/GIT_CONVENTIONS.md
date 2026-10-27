# QUY ƯỚC QUẢN LÝ MÃ NGUỒN VÀ COMMIT CODE (GIT CONVENTIONS)
Dự án: **OJT4_CNTT3**

---

## 1. QUY ƯỚC ĐẶT TÊN NHÁNH (BRANCHING STRATEGY)

Dự án áp dụng mô hình phân nhánh chuẩn **Gitflow**:

```
main (Production)
  └── develop (Môi trường tích hợp/Staging)
        ├── feature/OJT-01-user-login
        ├── bugfix/OJT-05-fix-jwt-expiration
        └── chore/OJT-02-setup-docker
```

### 1.1. Các nhánh chính:
- **`main`**: Nhánh chứa mã nguồn ổn định nhất đang chạy trên Production. Tuyệt đối **không** push code trực tiếp lên `main`.
- **`develop`**: Nhánh tích hợp các tính năng đã hoàn thiện trước khi release.

### 1.2. Định dạng tên nhánh phụ:
Cú pháp: `<loại-nhánh>/[mã-ticket-]<mô-tả-ngắn-gọn>`

| Loại nhánh | Mục đích | Ví dụ |
| :--- | :--- | :--- |
| `feature/` | Phát triển tính năng mới | `feature/OJT-01-user-auth`, `feature/product-crud` |
| `bugfix/` | Sửa lỗi trên nhánh develop | `bugfix/OJT-08-fix-null-pointer-user` |
| `hotfix/` | Sửa lỗi khẩn cấp trực tiếp từ `main` | `hotfix/OJT-99-fix-db-connection-leak` |
| `release/` | Chuẩn bị phiên bản phát hành mới | `release/v1.0.0` |
| `chore/` | Cấu hình, nâng cấp build, CI/CD | `chore/setup-docker-mysql`, `chore/update-gradle` |

---

## 2. QUY ƯỚC THÔNG ĐIỆP COMMIT (CONVENTIONAL COMMITS)

Mọi commit message trong dự án phải tuân theo chuẩn **Conventional Commits 1.0.0**:

### 2.1. Cấu trúc Commit Message:
```text
<type>(<scope>): <mô tả ngắn gọn bằng thể mệnh lệnh>

[Phần thân (body) - Tùy chọn: giải thích lý do, bối cảnh chi tiết]

[Phần chân (footer) - Tùy chọn: ghi số task/issue, ví dụ: Closes #12, Refs #45]
```

### 2.2. Danh sách các `<type>` hợp lệ:

| Type | Ý nghĩa | Ví dụ thực tế |
| :--- | :--- | :--- |
| **`feat`** | Thêm một tính năng mới cho ứng dụng | `feat(auth): implement user registration API` |
| **`fix`** | Sửa một lỗi (bug) trong mã nguồn | `fix(user): handle null pointer when email is empty` |
| **`docs`** | Thêm hoặc sửa đổi tài liệu (README, Markdown) | `docs: add coding and git conventions documentation` |
| **`style`** | Thay đổi format, dấu cách, chấm phẩy (không đổi logic code) | `style(order): format code according to Google Java style` |
| **`refactor`** | Tái cấu trúc mã nguồn (không thêm tính năng, không sửa lỗi) | `refactor(auth): extract token generation to JwtService` |
| **`perf`** | Cải thiện hiệu năng xử lý hoặc truy vấn | `perf(query): add index for users email column` |
| **`test`** | Thêm hoặc sửa đổi Unit Test, Integration Test | `test(user): add unit tests for UserServiceImpl` |
| **`chore`** | Cập nhật cấu hình build, dependencies, Docker, script | `chore(docker): configure mysql and phpmyadmin docker-compose` |

### 2.3. Quy tắc viết Subject (Tiêu đề):
- Sử dụng tiếng Anh hoặc tiếng Việt nhất quán (ưu tiên tiếng Anh chuẩn kỹ thuật).
- Bắt đầu bằng chữ thường hoặc chữ hoa nhưng không kết thúc bằng dấu chấm (`.`).
- Giới hạn tiêu đề commit dưới **72 ký tự**.
- Diễn đạt ngắn gọn, súc tích, mô tả hành động làm gì (thể mệnh lệnh: *add, fix, implement, refactor, update*).

---

## 3. QUY TRÌNH TẠO PULL REQUEST (PR / MR WORKFLOW)

1. **Chuẩn bị trước khi tạo PR**:
   - Rebase hoặc merge code mới nhất từ nhánh `develop` về nhánh feature của mình:
     ```bash
     git fetch origin
     git rebase origin/develop
     ```
   - Chạy test kiểm tra toàn bộ unit tests vượt qua:
     ```bash
     ./gradlew test
     ```
2. **Tiêu đề Pull Request**:
   - Tuân theo cấu trúc commit: `[OJT-01] feat(auth): implement login and jwt authentication`
3. **Nội dung Pull Request**:
   - Mô tả tóm tắt những gì đã thay đổi.
   - Hướng dẫn cách kiểm thử (steps to reproduce / test).
   - Ảnh chụp kết quả API (Postman / Swagger) hoặc kết quả unit test.
4. **Quy định Merge**:
   - Yêu cầu ít nhất **1 thành viên (Peer Reviewer)** phê duyệt (Approve) code.
   - Không có conflict với nhánh đích.
   - Sử dụng cơ chế **Squash and Merge** hoặc **Rebase and Merge** để giữ lịch sử commit của nhánh chính gọn gàng.
