import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import './ContactPage.css';

export const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="container contact-page-wrapper">
      <div className="contact-header">
        <span className="contact-badge">HỖ TRỢ TRỰC TUYẾN</span>
        <h1 className="contact-title">Liên hệ với Cyber</h1>
        <p className="contact-desc">
          Bạn cần tư vấn chi tiết về thiết bị, đơn hàng hoặc hợp tác kinh doanh? Hãy liên hệ với chúng tôi ngay hôm nay.
        </p>
      </div>

      <div className="contact-grid">
        {/* Thông tin liên hệ */}
        <div className="contact-info-card">
          <h2>Thông Tin Trụ Sở</h2>
          <p className="contact-info-sub">Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi yêu cầu từ bạn.</p>

          <div className="contact-items-list">
            <div className="contact-item">
              <div className="contact-item-icon">
                <MapPin size={20} />
              </div>
              <div>
                <strong>Địa chỉ Showroom</strong>
                <p>Tòa nhà Cyber Tower, 285 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. Hồ Chí Minh</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-icon">
                <Phone size={20} />
              </div>
              <div>
                <strong>Hotline Hỗ Trợ 24/7</strong>
                <p>1900 8989 (Nhánh 1: Tư vấn bán hàng - Nhánh 2: Kỹ thuật)</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-icon">
                <Mail size={20} />
              </div>
              <div>
                <strong>Email Liên Hệ</strong>
                <p>support@cybertech.vn / contact@cybertech.vn</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-icon">
                <Clock size={20} />
              </div>
              <div>
                <strong>Thời Gian Mở Cửa</strong>
                <p>Thứ 2 - Chủ Nhật: 08:00 - 22:00 (Kể cả ngày lễ)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form gửi liên hệ */}
        <div className="contact-form-card">
          {submitted ? (
            <div className="contact-success-state">
              <CheckCircle2 size={56} color="#10b981" />
              <h3>Gửi liên hệ thành công!</h3>
              <p>Cảm ơn bạn đã liên hệ với Cyber. Đội ngũ chuyên viên sẽ phản hồi bạn qua email <strong>{formData.email}</strong> trong vòng 2 giờ làm việc.</p>
              <button type="button" className="btn btn-outline" onClick={() => setSubmitted(false)}>
                Gửi câu hỏi khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2>Gửi Tin Nhắn Cho Chúng Tôi</h2>
              <div className="contact-form-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập họ và tên của bạn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="contact-form-row">
                <div className="contact-form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="contact-form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="contact-form-group">
                <label>Chủ đề cần tư vấn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tư vấn mua máy tính bảng, kiểm tra bảo hành..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="contact-form-group">
                <label>Nội dung tin nhắn *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Hãy mô tả chi tiết yêu cầu của bạn..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary contact-submit-btn">
                <Send size={16} /> Gửi tin nhắn ngay
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
