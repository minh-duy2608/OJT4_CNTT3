import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useCart } from '../context/CartContext';
import { FlyToCartAnimation } from '../components/FlyToCartAnimation';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export const MainLayout = () => {
  const { toastMessage, setToastMessage } = useCart();

  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />

      {/* Hiệu ứng sản phẩm bay vào giỏ hàng kiểu Shopee */}
      <FlyToCartAnimation />

      {/* Global Toast Thông báo (khi chưa đăng nhập hoặc thêm giỏ hàng) */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="auth-warning-toast"
          style={{
            borderColor: toastMessage.type === 'warning' ? '#f59e0b' : '#10b981'
          }}
        >
          {toastMessage.type === 'warning' ? (
            <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
          )}
          <span>{toastMessage.message}</span>
          {toastMessage.type === 'warning' && (
            <Link to="/auth?mode=login" className="auth-warning-btn" onClick={() => setToastMessage(null)}>
              Đăng nhập ngay
            </Link>
          )}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ba19d',
              cursor: 'pointer',
              marginLeft: '4px',
              display: 'flex'
            }}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </div>
  );
};
