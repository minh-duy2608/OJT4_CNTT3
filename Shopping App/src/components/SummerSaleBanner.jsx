import React from 'react';
import { Link } from 'react-router-dom';
import ipadImg from '../assets/products/ipad-9.png';
import iphoneImg from '../assets/products/iphone-14-pro.png';
import watchImg from '../assets/products/apple-watch.png';
import './SummerSaleBanner.css';

export const SummerSaleBanner = () => {
  return (
    <section className="cyber-summer-banner-wrapper" aria-label="Banner Ưu đãi mùa hè">
      <div className="container summer-banner-container">
        {/* Hình ảnh bên trái: Máy tính bảng iPad góc trái */}
        <div className="summer-banner-left">
          <div className="summer-banner-tablet-box">
            <img 
              src={ipadImg} 
              alt="Tablet iPad Ưu đãi mùa hè" 
              className="summer-banner-tablet-img"
              loading="lazy"
            />
          </div>
        </div>

        {/* Nội dung chính ở giữa: Tiêu đề, Dấu gạch nét đứt, Mô tả, Nút Mua ngay */}
        <div className="summer-banner-center">
          <h2 className="summer-banner-title">
            Ưu đãi mùa hè
          </h2>
          <div className="summer-banner-divider-line" />
          <p className="summer-banner-subtitle">
            Nhanh tay săn đón các sản phẩm chất lượng
          </p>
          <Link 
            to="/products?category=phones" 
            className="summer-banner-btn"
            title="Khám phá ngay ưu đãi mùa hè"
          >
            Mua ngay
          </Link>
        </div>

        {/* Hình ảnh bên phải: iPhone nghiêng và Apple Watch góc dưới */}
        <div className="summer-banner-right">
          <div className="summer-banner-cluster">
            <img 
              src={iphoneImg} 
              alt="iPhone 14 Pro" 
              className="summer-banner-phone-img"
              loading="lazy"
            />
            <img 
              src={watchImg} 
              alt="Apple Watch" 
              className="summer-banner-watch-img"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
