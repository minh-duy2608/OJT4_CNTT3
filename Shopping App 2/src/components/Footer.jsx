import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import './Footer.css';

// Logo icon tam giác Cyber
const CyberIcon = ({ className = "cyber-footer-logo-icon" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-hidden="true"
  >
    <path 
      d="M3 5H21L12 20L3 5Z" 
      stroke="currentColor" 
      strokeWidth="2.8" 
      strokeLinejoin="round" 
    />
  </svg>
);

// TikTok icon SVG chính xác
const TikTokIcon = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.54 4.83 4.83 0 0 1-.04-4.4z"/>
  </svg>
);

export const Footer = () => {
  return (
    <footer className="cyber-footer" role="contentinfo">
      <div className="container">
        <div className="cyber-footer-grid">
          {/* CỘT 1: THƯƠNG HIỆU & MẠNG XÃ HỘI */}
          <div className="cyber-footer-brand">
            <Link to="/" className="cyber-footer-logo" aria-label="Cyber Trang chủ">
              <CyberIcon />
              <span>cyber</span>
            </Link>

            <p className="cyber-footer-desc">
              Chúng tôi cung cấp các sản phẩm công nghệ, giúp khách hàng thỏa sức trải nghiệm các dịch vụ, tiện ích nhanh chóng và hiệu quả.
            </p>

            <div className="cyber-footer-socials" aria-label="Mạng xã hội">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="cyber-social-link" aria-label="Twitter">
                <Twitter size={19} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="cyber-social-link" aria-label="Facebook">
                <Facebook size={19} />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="cyber-social-link" aria-label="TikTok">
                <TikTokIcon size={19} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="cyber-social-link" aria-label="Instagram">
                <Instagram size={19} />
              </a>
            </div>
          </div>

          {/* CỘT 2: DỊCH VỤ */}
          <div className="cyber-footer-col">
            <h3 className="cyber-footer-heading">Dịch vụ</h3>
            <ul className="cyber-footer-links">
              <li>
                <Link to="/products" className="cyber-footer-link">
                  Chương trình khuyến mãi
                </Link>
              </li>
              <li>
                <Link to="/gift-cards" className="cyber-footer-link">
                  Gift cards
                </Link>
              </li>
              <li>
                <Link to="/credit-payment" className="cyber-footer-link">
                  Tín dụng và thanh toán
                </Link>
              </li>
              <li>
                <Link to="/contract-services" className="cyber-footer-link">
                  Dịch vụ hợp đồng
                </Link>
              </li>
              <li>
                <Link to="/crypto-wallet" className="cyber-footer-link">
                  Ví tiền điện tử
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="cyber-footer-link">
                  Thanh toán
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: HỖ TRỢ CHO NGƯỜI MUA */}
          <div className="cyber-footer-col">
            <h3 className="cyber-footer-heading">Hỗ trợ cho người mua</h3>
            <ul className="cyber-footer-links">
              <li>
                <Link to="/orders" className="cyber-footer-link">
                  Tìm kiếm đơn đặt hàng
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="cyber-footer-link">
                  Điều khoản giao hàng
                </Link>
              </li>
              <li>
                <Link to="/returns" className="cyber-footer-link">
                  Trao đổi và trả hàng
                </Link>
              </li>
              <li>
                <Link to="/warranty" className="cyber-footer-link">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link to="/faq" className="cyber-footer-link">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link to="/terms" className="cyber-footer-link">
                  Chính sách và điều khoản
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
