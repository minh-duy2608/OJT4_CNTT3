import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';
import { AuthPage } from '../pages/AuthPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminPage } from '../pages/AdminPage';
import { SellerChatPage } from '../pages/SellerChatPage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { InfoPage } from '../pages/InfoPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<HomePage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="register" element={<AuthPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="chat" element={<SellerChatPage />} />
        <Route path="messages" element={<SellerChatPage />} />

        {/* Thông tin & Liên hệ Header */}
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />

        {/* Dịch vụ & Chính sách Footer */}
        <Route path="shipping" element={<InfoPage />} />
        <Route path="returns" element={<InfoPage />} />
        <Route path="warranty" element={<InfoPage />} />
        <Route path="faq" element={<InfoPage />} />
        <Route path="terms" element={<InfoPage />} />
        <Route path="gift-cards" element={<InfoPage />} />
        <Route path="credit-payment" element={<InfoPage />} />
        <Route path="contract-services" element={<InfoPage />} />
        <Route path="crypto-wallet" element={<InfoPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
