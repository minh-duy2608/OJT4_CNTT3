# QUY ƯỚC VIẾT MÃ NGUỒN (CODING CONVENTIONS)
Dự án: **OJT4_CNTT3** (Backend: Java 21, Spring Boot)

---

## 1. NGUYÊN TẮC THIẾT KẾ & KIẾN TRÚC TẦNG (LAYERED ARCHITECTURE)

Dự án áp dụng mô hình phân tầng tiêu chuẩn trong Spring Boot:

```
src/main/java/com/example/demo/
├── config/             # Cấu hình hệ thống (Security, WebMvc, Swagger, CORS, Database)
├── controller/         # Tiếp nhận HTTP Request, validate tham số đầu vào, gọi Service
├── dto/                # Data Transfer Object (Request, Response)
│   ├── request/        # Đối tượng nhận payload từ client
│   └── response/       # Đối tượng trả về cho client
├── entity/             # Các Entity ánh xạ trực tiếp với bảng trong Database (JPA)
├── exception/          # Custom Exception và Global Exception Handler (@ControllerAdvice)
├── repository/         # Tầng truy xuất dữ liệu kế thừa JpaRepository
├── service/            # Interface & Business Logic
│   └── impl/           # Implementation của Service
└── util/               # Các hàm tiện ích dùng chung (DateUtils, SecurityUtils,...)
```

### 1.1. Trách nhiệm của từng tầng:
- **Controller**:
  - Tuyệt đối **không** chứa logic nghiệp vụ (business logic) hay truy vấn database trực tiếp.
  - Sử dụng `@Valid` để kiểm tra tính hợp lệ của Request DTO.
  - Luôn bọc kết quả trả về trong đối tượng phản hồi chung `ApiResponse<T>` hoặc `ResponseEntity<ApiResponse<T>>`.
- **Service**:
  - Chứa toàn bộ nghiệp vụ (tính toán, kiểm tra quyền dữ liệu, giao dịch database).
  - Sử dụng `@Transactional` tại tầng service khi thực hiện các thao tác thay đổi dữ liệu (insert/update/delete) hoặc yêu cầu tính toàn vẹn.
  - Quản lý exception nghiệp vụ bằng cách throw các Custom Exception (ví dụ: `ResourceNotFoundException`, `BadRequestException`).
- **Repository**:
  - Chỉ phục vụ thao tác CRUD và truy vấn DB (Spring Data JPA, JPQL, Native Query).
- **Entity**:
  - Đại diện cho bảng trong Database, không truyền trực tiếp Entity ra ngoài API Client, phải thông qua DTO để tránh lộ cấu trúc nội bộ hoặc lỗi lazy loading/circular reference.

---

## 2. QUY ƯỚC ĐẶT TÊN (NAMING CONVENTIONS)

| Đối tượng | Quy tắc | Ví dụ | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Package** | `lowercase`, viết liền không dấu | `com.example.demo.service` | Tuân thủ domain đảo ngược |
| **Class** | `PascalCase` | `UserServiceImpl`, `AuthController` | Danh từ, mô tả rõ vai trò |
| **Interface** | `PascalCase` | `UserService`, `UserRepository` | Không thêm tiền tố `I` |
| **Method** | `camelCase` | `getUserById()`, `createNewOrder()` | Động từ hoặc bắt đầu bằng động từ |
| **Variable** | `camelCase` | `userEmail`, `totalPrice` | Tên có ý nghĩa, tránh viết tắt bừa bãi |
| **Constant** | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `DEFAULT_ROLE` | Phải khai báo `public static final` |
| **Generic Type**| Chữ cái in hoa | `T`, `E`, `K`, `V` | Chuẩn Java Generic |

### Quy ước hậu tố lớp (Class Suffixes):
- `*Controller`: Lớp Controller REST API (ví dụ: `UserController`)
- `*Service`: Interface Service (ví dụ: `UserService`)
- `*ServiceImpl`: Lớp hiện thực của Service (ví dụ: `UserServiceImpl`)
- `*Repository`: Interface Data Access (ví dụ: `UserRepository`)
- `*Request`: DTO đầu vào (ví dụ: `UserCreationRequest`, `LoginRequest`)
- `*Response`: DTO đầu ra (ví dụ: `UserResponse`, `LoginResponse`)
- `*Exception`: Ngoại lệ tự định nghĩa (ví dụ: `UserNotFoundException`)

---

## 3. QUY ƯỚC ĐỊNH DẠNG CODE (FORMATTING & STYLE)

1. **Thụt lề (Indentation)**:
   - Sử dụng **4 khoảng trắng (spaces)** cho mỗi mức thụt lề trong Java, không dùng phím Tab.
2. **Độ dài dòng (Line Length)**:
   - Giới hạn tối đa **120 ký tự** trên một dòng. Khi xuống dòng, thụt lề 8 khoảng trắng.
3. **Dấu ngoặc nhọn (Braces)**:
   - Sử dụng phong cách K&R (One True Brace Style): mở ngoặc `{` nằm cùng dòng với khai báo, đóng ngoặc `}` nằm trên dòng riêng.
   ```java
   if (condition) {
       // do something
   } else {
       // do other
   }
   ```
4. **Nhập thư viện (Imports)**:
   - Tuyệt đối **không** dùng wildcard import (ví dụ: `import java.util.*;`).
   - Xóa bỏ các import không sử dụng trước khi commit code (tận dụng tính năng Optimize Imports của IDE: `Ctrl + Alt + O`).

---

## 4. XỬ LÝ LỖI & PHẢN HỒI CHUẨN (EXCEPTION HANDLING & API RESPONSE)

### 4.1. Cấu trúc phản hồi API thống nhất:
Mọi API trả về JSON phải tuân thủ schema mẫu:
```json
{
  "success": true,
  "code": 200,
  "message": "Thao tác thành công",
  "data": { ... },
  "timestamp": "2026-10-27T07:30:00"
}
```

### 4.2. Xử lý ngoại lệ tập trung:
- Tạo lớp `@RestControllerAdvice` để bắt và chuyển đổi các Exception thành mã HTTP Status và thông báo chuẩn:
  - `400 Bad Request`: Dữ liệu đầu vào không hợp lệ (`MethodArgumentNotValidException`).
  - `401 Unauthorized`: Chưa xác thực / token hết hạn.
  - `403 Forbidden`: Không có quyền truy cập tài nguyên.
  - `404 Not Found`: Không tìm thấy tài nguyên (`ResourceNotFoundException`).
  - `500 Internal Server Error`: Lỗi hệ thống không lường trước.
- Không để lộ stack trace nội bộ ra client trong môi trường Production.

---

## 5. THỰC HÀNH CLEAN CODE & AN TOÀN BẢO MẬT

1. **Dependency Injection**:
   - Sử dụng **Constructor Injection** thay vì `@Autowired` trên field. (Khuyến khích dùng `@RequiredArgsConstructor` của Lombok).
2. **Tránh Magic Numbers & Magic Strings**:
   - Mọi hằng số hoặc chuỗi cố định phải được đưa vào hằng số `public static final` hoặc file cấu hình `application.yml`.
3. **Kiểm tra Null an toàn**:
   - Sử dụng `Optional<T>` khi trả về từ Repository/Service thay vì trả về `null`.
   - Sử dụng các thư viện tiện ích như `Objects.equals(...)`, `StringUtils.hasText(...)`.
4. **Bảo mật**:
   - Tuyệt đối **không lưu trữ mật khẩu ở dạng plain-text**, phải mã hóa với BCrypt.
   - Không commit thông tin nhạy cảm (Secret Key, Password, Token) lên Git. Phải đưa vào file biến môi trường `.env`.
