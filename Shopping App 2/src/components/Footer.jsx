import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Zap, ArrowRight } from 'lucide-react';
import './Footer.css';

/**
 * CyberIcon Component - SVG Logo hình tam giác thương hiệu Cyber
 */
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

/**
 * TikTokIcon Component - SVG Icon tùy chỉnh chính xác cho TikTok
 */
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

/**
 * Main Footer Component
 * Render footer thông tin thương hiệu, mạng xã hội, dịch vụ và chính sách hỗ trợ
 */
export const Footer = () => {
  // Cấu hình danh sách dịch vụ
  const serviceLinks = useMemo(() => [

    { label: 'Chương trình khuyến mãi', path: '/products' },
    { label: 'Gift cards', path: '/gift-cards' },
    { label: 'Tín dụng và thanh toán', path: '/credit-payment' },
    { label: 'Dịch vụ hợp đồng', path: '/contract-services' },
    { label: 'Ví tiền điện tử', path: '/crypto-wallet' },
    { label: 'Thanh toán', path: '/checkout' },
  ], []);

  // Cấu hình danh sách hỗ trợ khách hàng
  const supportLinks = useMemo(() => [

    { label: 'Tìm kiếm đơn đặt hàng', path: '/orders' },
    { label: 'Điều khoản giao hàng', path: '/shipping' },
    { label: 'Trao đổi và trả hàng', path: '/returns' },
    { label: 'Chính sách bảo hành', path: '/warranty' },
    { label: 'Câu hỏi thường gặp', path: '/faq' },
    { label: 'Chính sách và điều khoản', path: '/terms' },
  ], []);

  return (
      <footer className="cyber-footer" role="contentinfo">
        <div className="container">

          {/* ================================================================
              FOOTER PROMO BANNER — Discount / Khuyến mại
              Nằm phía trên các cột liên kết thông tin
              ================================================================ */}
          <div className="footer-promo-banner" aria-label="Ưu đãi giảm giá đặc biệt">

            {/* Cột trái: Badge + Tiêu đề + Mô tả */}
            <div className="footer-promo-text">
              <div className="footer-promo-badge">
                <Zap size={11} strokeWidth={2.5} />
                HOT DEAL · Flash Sale
              </div>

              <h2 className="footer-promo-title">
                Ưu đãi đặc biệt{' '}
                <span className="footer-promo-title-accent">chỉ hôm nay!</span>
              </h2>

              <p className="footer-promo-desc">
                Hàng trăm sản phẩm công nghệ cao cấp — iPhone, MacBook, Samsung — giảm đến{' '}
                <strong style={{ color: '#f0abfc' }}>50%</strong>. Số lượng có hạn, nhanh tay kẻo lỡ!
              </p>
            </div>

            {/* Cột phải: Badge % + Nút CTA */}
            <div className="footer-promo-cta-col">
              {/* Vòng tròn % giảm giá */}
              <div className="footer-promo-discount-badge" aria-label="Giảm đến 50%">
                <span className="footer-promo-discount-number">50%</span>
                <span className="footer-promo-discount-label">OFF</span>
              </div>

              {/* Nút "Xem ưu đãi ngay" → điều hướng sang trang sản phẩm, giữ nguyên route hiện có */}
              <Link
                to="/products"
                className="footer-promo-cta-btn"
                aria-label="Xem tất cả sản phẩm đang giảm giá"
              >
                Xem ưu đãi ngay
                <ArrowRight size={16} className="footer-promo-cta-arrow" />
              </Link>
            </div>
          </div>
          {/* END FOOTER PROMO BANNER */}

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
                {serviceLinks.map((item, index) => (
                    <li key={`service-${index}`}>
                      {item.isExternal ? (
                          <a
                              href={item.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cyber-footer-link"
                              style={item.highlight ? { color: '#10b981', fontWeight: 600 } : undefined}
                          >
                            {item.label}
                          </a>
                      ) : (
                          <Link to={item.path} className="cyber-footer-link">
                            {item.label}
                          </Link>
                      )}
                    </li>
                ))}
              </ul>
            </div>

            {/* CỘT 3: HỖ TRỢ CHO NGƯỜI MUA */}
            <div className="cyber-footer-col">
              <h3 className="cyber-footer-heading">Hỗ trợ cho người mua</h3>
              <ul className="cyber-footer-links">
                {supportLinks.map((item, index) => (
                    <li key={`support-${index}`}>
                      {item.isExternal ? (
                          <a
                              href={item.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cyber-footer-link"
                              style={item.highlight ? { color: '#10b981', fontWeight: 600 } : undefined}
                          >
                            {item.label}
                          </a>
                      ) : (
                          <Link to={item.path} className="cyber-footer-link">
                            {item.label}
                          </Link>
                      )}
                    </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </footer>
  );
};

export default Footer;
