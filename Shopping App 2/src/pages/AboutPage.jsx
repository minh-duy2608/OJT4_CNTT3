import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Headphones, Award, Smartphone, Laptop, CheckCircle2, ArrowRight } from 'lucide-react';
import './AboutPage.css';

export const AboutPage = () => {
  return (
    <div className="container about-page-wrapper">
      {/* Hero Section */}
      <div className="about-hero-section">
        <span className="about-badge">VỀ CHÚNG TÔI</span>
        <h1 className="about-hero-title">Chào mừng đến với Hệ sinh thái Công nghệ Cyber</h1>
        <p className="about-hero-desc">
          Cyber là thương hiệu hàng đầu chuyên phân phối thiết bị công nghệ chính hãng, điện thoại cao cấp, laptop đồ họa, phụ kiện âm thanh đỉnh cao và thiết bị thông minh thế hệ mới tại Việt Nam.
        </p>
      </div>

      {/* 4 Giá trị cốt lõi */}
      <div className="about-features-grid">
        <div className="about-feature-card">
          <div className="about-feature-icon">
            <Award size={28} />
          </div>
          <h3>100% Chính Hãng</h3>
          <p>Cam kết tất cả thiết bị đều là sản phẩm chính hãng có chứng nhận nguồn gốc xuất xứ rõ ràng từ Apple, Samsung, Sony,...</p>
        </div>

        <div className="about-feature-card">
          <div className="about-feature-icon">
            <ShieldCheck size={28} />
          </div>
          <h3>Bảo Hành Toàn Diện</h3>
          <p>Chính sách bảo hành đổi mới 1-1 trong 30 ngày đối với lỗi từ nhà sản xuất và hỗ trợ bảo hành chính hãng lên tới 24 tháng.</p>
        </div>

        <div className="about-feature-card">
          <div className="about-feature-icon">
            <Truck size={28} />
          </div>
          <h3>Giao Hàng Siêu Tốc</h3>
          <p>Hỏa tốc 2 giờ nội thành Hà Nội & TP. Hồ Chí Minh. Giao hàng toàn quốc an toàn, cho phép đồng kiểm trước khi nhận.</p>
        </div>

        <div className="about-feature-card">
          <div className="about-feature-icon">
            <Headphones size={28} />
          </div>
          <h3>Hỗ Trợ 24/7</h3>
          <p>Đội ngũ chuyên viên kỹ thuật công nghệ luôn sẵn sàng giải đáp thắc mắc và hỗ trợ cài đặt thiết bị mọi lúc mọi nơi.</p>
        </div>
      </div>

      {/* Sứ mệnh & Tầm nhìn */}
      <div className="about-mission-section">
        <div className="about-mission-content">
          <h2>Sứ Mệnh Tiên Phong</h2>
          <p>
            Chúng tôi tin rằng công nghệ tiên tiến không chỉ đơn thuần là công cụ phục vụ công việc, mà còn là nguồn cảm hứng nâng tầm chất lượng cuộc sống mỗi ngày. Cyber không ngừng nỗ lực mang những siêu phẩm công nghệ tân tiến nhất thế giới đến tận tay người tiêu dùng Việt Nam với mức giá hợp lý nhất và trải nghiệm dịch vụ trọn vẹn nhất.
          </p>
          <ul className="about-mission-points">
            <li><CheckCircle2 size={18} color="#10b981" /> Hơn 50.000+ khách hàng hài lòng trên toàn quốc</li>
            <li><CheckCircle2 size={18} color="#10b981" /> Đối tác ủy quyền chiến lược của các tập đoàn công nghệ lớn</li>
            <li><CheckCircle2 size={18} color="#10b981" /> Hệ thống mua sắm trực tuyến bảo mật, tiện lợi và tức thì</li>
          </ul>
          <Link to="/products" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '1.5rem' }}>
            Khám phá sản phẩm ngay <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

