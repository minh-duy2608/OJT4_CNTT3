import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <section className="not-found-page" style={{ textAlign: 'center', padding: '3rem 0' }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--primary-color)' }}>404</h1>
      <h2 style={{ margin: '1rem 0' }}>Không tìm thấy trang</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
        Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.
      </p>
      <Link to="/" className="btn">
        Về trang chủ
      </Link>
    </section>
  );
};

