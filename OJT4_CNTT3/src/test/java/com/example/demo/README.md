# HƯỚNG DẪN CẤU TRÚC THƯ MỤC KIỂM THỬ (TEST DIRECTORY STRUCTURE)

## 1. Cấu trúc thư mục
```
src/test/java/com/example/demo/
├── common/             # Lớp cơ sở (BaseUnitTest), test fixtures, utilities tạo dữ liệu giả lập
├── controller/         # Kiểm thử tầng Controller (Unit/Slice test với @WebMvcTest, MockMvc)
├── service/            # Kiểm thử tầng nghiệp vụ Service (Unit test với Mockito, @ExtendWith)
├── repository/         # Kiểm thử tầng dữ liệu Repository (@DataJpaTest, H2 in-memory test)
└── integration/        # Kiểm thử tích hợp toàn diện (@SpringBootTest, End-to-End API flows)

src/test/resources/
└── application-test.properties  # File cấu hình riêng cho môi trường kiểm thử
```

## 2. Quy tắc đặt tên phương thức Test
Áp dụng mẫu **Given - When - Then**:
`given[Precondition]_when[ActionUnderTest]_then[ExpectedBehavior]`

*Ví dụ:*
- `givenValidUser_whenRegister_thenReturnsCreatedStatus()`
- `givenExistingEmail_whenRegister_thenThrowsConflictException()`
- `givenNonExistentId_whenFindById_thenReturnsEmptyOptional()`

## 3. Cấu trúc một hàm Test chuẩn (AAA Pattern)
- **Arrange**: Chuẩn bị dữ liệu đầu vào và thiết lập mock behavior (`when(...).thenReturn(...)`).
- **Act**: Thực thi phương thức cần kiểm thử.
- **Assert**: Kiểm tra kết quả trả về (`assertEquals`, `assertThrows`, `verify(...)`).
