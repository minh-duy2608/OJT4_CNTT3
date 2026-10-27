# Shopping App - Base Frontend (React JS)

Dự án Frontend cơ bản dành cho ứng dụng mua sắm (Shopping App), xây dựng bằng **React JS**, tối ưu chuẩn ngữ nghĩa **HTML5**, hệ thống style **CSS3** hiện đại và điều hướng đa trang với **React Router DOM**.

---

## 📁 Cấu trúc thư mục (Base Structure)

```text
Shopping App/
├── index.html              # File HTML5 chuẩn SEO và viewport
├── vite.config.js          # Cấu hình Vite dev server & build
├── package.json            # Quản lý dependencies & scripts
├── src/
│   ├── assets/             # Hình ảnh, icons tĩnh
│   ├── components/         # Các component giao diện dùng chung
│   │   ├── Header.jsx      # Semantic HTML5 <header> & <nav>
│   │   └── Footer.jsx      # Semantic HTML5 <footer>
│   ├── layouts/
│   │   └── MainLayout.jsx  # Layout chính bọc <Outlet />
│   ├── pages/              # Các trang giao diện (Views)
│   │   ├── HomePage.jsx          # Trang chủ (/)
│   │   ├── ProductsPage.jsx      # Danh sách sản phẩm (/products)
│   │   ├── ProductDetailPage.jsx  # Chi tiết sản phẩm (/products/:id)
│   │   ├── CartPage.jsx          # Giỏ hàng (/cart)
│   │   └── NotFoundPage.jsx      # Trang 404 (*)
│   ├── routes/
│   │   └── AppRoutes.jsx   # Cấu hình Routes với react-router-dom
│   ├── styles/
│   │   └── index.css       # CSS3 reset, variables (:root), layout & components
│   ├── App.jsx             # Root component bọc BrowserRouter
│   └── main.jsx            # Entry point ứng dụng React
```

---

## 🚀 Hướng dẫn khởi chạy

### 1. Cài đặt thư viện (nếu cần):
```bash
npm install
```

### 2. Chạy môi trường phát triển (Dev Server):
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 3. Build sản phẩm (Production):
```bash
npm run build
```

---

## 🎯 Các chuẩn đã áp dụng

- **Chuẩn HTML5**:
  - Thẻ bố cục ngữ nghĩa: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
  - Thuộc tính trợ năng cơ bản: `aria-label`, viewport responsive.

- **Chuẩn CSS3**:
  - CSS Variables (`:root`) dễ dàng thay đổi màu sắc, bo góc, font chữ.
  - Reset CSS hiện đại (`box-sizing: border-box`).
  - Layout linh hoạt với CSS Flexbox & CSS Grid.

- **Điều hướng Router (React Router DOM v6)**:
  - `BrowserRouter`, `Routes`, `Route`, `Outlet`.
  - Phân trang động (Dynamic Route) với `useParams` (`/products/:id`).
  - Active state cho thanh điều hướng với `NavLink`.

