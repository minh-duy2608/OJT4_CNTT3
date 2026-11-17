import React, { useState, useEffect } from 'react';
import { 
  X, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Image, 
  Sparkles,
  ArrowRight,
  Landmark,
  CreditCard,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { shopApi } from '../services/shopApi';
import { useAuth } from '../context/AuthContext';
import './RegisterShopModal.css';

export const RegisterShopModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    province: '',
    district: '',
    ward: '',
    addressDetail: '',
    description: '',
    logoUrl: '',
    bankName: 'BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)',
    bankBin: '970418',
    bankAccountNumber: '8814310515',
    bankAccountName: 'HOANG THIEN SON'
  });

  const [agreedToContract, setAgreedToContract] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successShop, setSuccessShop] = useState(null);

  // Pre-fill user contact info if available
  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || ''
      }));
      setError(null);
      setSuccessShop(null);
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên cửa hàng');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Vui lòng nhập số điện thoại liên hệ cửa hàng');
      return;
    }
    const cleanPhone = formData.phone.trim().replace(/[\s-.]/g, '');
    if (!cleanPhone.startsWith('0')) {
      setError('Số điện thoại liên hệ cửa hàng phải bắt đầu bằng số 0');
      return;
    }
    if (!/^\d+$/.test(cleanPhone) || cleanPhone.length !== 10) {
      setError(`Số điện thoại phải gồm đúng 10 chữ số (hiện có ${cleanPhone.length} số)`);
      return;
    }

    if (!agreedToContract) {
      setError('Vui lòng tích chọn đồng ý điều khoản hợp đồng người bán (tự trừ 2.5% phí sàn và quyết toán ngày 19 hàng tháng) để hoàn tất đăng ký.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await shopApi.registerShop({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        province: formData.province.trim() || undefined,
        district: formData.district.trim() || undefined,
        ward: formData.ward.trim() || undefined,
        addressDetail: formData.addressDetail.trim() || undefined,
        description: formData.description.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        bankName: formData.bankName.trim(),
        bankBin: formData.bankBin.trim(),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        bankAccountName: formData.bankAccountName.trim(),
        contractAgreed: true
      });

      // Cập nhật lại phiên đăng nhập để nhận vai trò SHOP_MANAGER
      await refreshUser();

      // Tự động đóng modal đăng ký thành công
      if (typeof onClose === 'function') {
        onClose();
      }

      if (typeof onSuccess === 'function') {
        onSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Không thể đăng ký cửa hàng. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-shop-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="register-shop-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="register-shop-header">
          <div className="register-shop-title-wrap">
            <div className="shop-header-icon-box">
              <Store size={22} />
            </div>
            <div>
              <h3 className="register-shop-title">Đăng ký Cửa hàng (Trở thành Người bán)</h3>
              <p className="register-shop-subtitle">
                Mở kênh bán hàng trực tuyến tại Cyber Mall và tự do quản lý sản phẩm, đơn hàng của riêng bạn.
              </p>
            </div>
          </div>
          <button type="button" className="register-shop-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="register-shop-body">
          {successShop ? (
            <div className="register-shop-success-box">
              <div className="success-icon-bubble">
                <CheckCircle2 size={40} color="#16a34a" />
              </div>
              <h4 className="success-title">Chúc mừng! Bạn đã mở cửa hàng thành công</h4>
              <p className="success-desc">
                Cửa hàng <strong>"{successShop.name}"</strong> (ID: #{successShop.id}) đã được kích hoạt.
                Tài khoản của bạn đã được nâng cấp thành <strong>Quản lý Shop (SHOP_MANAGER)</strong> với đầy đủ các quyền thêm, sửa, xóa sản phẩm và xử lý đơn hàng!
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn-success-go-seller"
                  onClick={() => {
                    onClose();
                    window.location.href = '/admin';
                  }}
                >
                  Truy cập Kênh Quản lý Cửa hàng ngay <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-shop-form">
              {error && (
                <div className="register-shop-error-banner">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="shop-form-info-tip">
                <Sparkles size={16} color="#2563eb" />
                <span>
                  Đang trong giai đoạn thử nghiệm: Sau khi đăng ký, cửa hàng sẽ được <strong>kích hoạt tự động</strong> ngay lập tức để bạn có thể tải lên sản phẩm và thử nghiệm toàn bộ tính năng bán hàng!
                </span>
              </div>

              {/* Form Grid */}
              <div className="shop-form-grid">
                {/* Tên cửa hàng */}
                <div className="shop-field-group full-width">
                  <label className="shop-form-label">
                    Tên cửa hàng của bạn <span className="req">*</span>
                  </label>
                  <div className="shop-input-wrapper">
                    <Store size={16} className="input-icon" />
                    <input
                      type="text"
                      name="name"
                      className="shop-form-input"
                      placeholder="VD: Cyber SmartTech, Thế Giới Táo Chính Hãng..."
                      required
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Số điện thoại Hotline */}
                <div className="shop-field-group">
                  <label className="shop-form-label">
                    Số điện thoại Hotline <span className="req">*</span>
                  </label>
                  <div className="shop-input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      name="phone"
                      className="shop-form-input"
                      placeholder="VD: 0987654321"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Email Shop */}
                <div className="shop-field-group">
                  <label className="shop-form-label">
                    Email liên hệ cửa hàng
                  </label>
                  <div className="shop-input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      name="email"
                      className="shop-form-input"
                      placeholder="contact@myshop.vn"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Tỉnh / Thành phố */}
                <div className="shop-field-group">
                  <label className="shop-form-label">Tỉnh / Thành phố</label>
                  <div className="shop-input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      name="province"
                      className="shop-form-input"
                      placeholder="VD: Hà Nội, TP. Hồ Chí Minh..."
                      value={formData.province}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Quận / Huyện */}
                <div className="shop-field-group">
                  <label className="shop-form-label">Quận / Huyện</label>
                  <div className="shop-input-wrapper">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      name="district"
                      className="shop-form-input"
                      placeholder="VD: Cầu Giấy, Quận 1..."
                      value={formData.district}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Địa chỉ chi tiết */}
                <div className="shop-field-group full-width">
                  <label className="shop-form-label">Địa chỉ kho / trụ sở cửa hàng</label>
                  <input
                    type="text"
                    name="addressDetail"
                    className="shop-form-input"
                    placeholder="VD: Số 123 Đường Cầu Giấy, Phường Dịch Vọng"
                    value={formData.addressDetail}
                    onChange={handleChange}
                  />
                </div>

                {/* Mô tả cửa hàng */}
                <div className="shop-field-group full-width">
                  <label className="shop-form-label">Giới thiệu ngắn về cửa hàng</label>
                  <textarea
                    name="description"
                    className="shop-form-textarea"
                    rows="3"
                    placeholder="Chuyên cung cấp các sản phẩm công nghệ, phụ kiện cao cấp chính hãng bảo hành 12 tháng..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                {/* Logo URL */}
                <div className="shop-field-group full-width">
                  <label className="shop-form-label">URL Logo cửa hàng (tùy chọn)</label>
                  <div className="shop-input-wrapper">
                    <Image size={16} className="input-icon" />
                    <input
                      type="url"
                      name="logoUrl"
                      className="shop-form-input"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={formData.logoUrl}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Tài khoản ngân hàng nhận tiền quyết toán */}
                <div className="shop-field-group full-width" style={{ marginTop: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                  <label className="shop-form-label" style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark size={17} color="#2563eb" />
                    Tài khoản ngân hàng liên kết nhận doanh thu <span className="req">*</span>
                  </label>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '2px 0 10px 0' }}>
                    Doanh thu bán hàng (đã khấu trừ 2.5% phí sàn) sẽ được tự động quyết toán định kỳ vào tài khoản này.
                  </p>
                </div>

                <div className="shop-field-group">
                  <label className="shop-form-label">Tên Ngân hàng <span className="req">*</span></label>
                  <div className="shop-input-wrapper">
                    <Landmark size={16} className="input-icon" />
                    <input
                      type="text"
                      name="bankName"
                      className="shop-form-input"
                      placeholder="BIDV, Vietcombank, MB Bank..."
                      value={formData.bankName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="shop-field-group">
                  <label className="shop-form-label">Số tài khoản ngân hàng <span className="req">*</span></label>
                  <div className="shop-input-wrapper">
                    <CreditCard size={16} className="input-icon" />
                    <input
                      type="text"
                      name="bankAccountNumber"
                      className="shop-form-input"
                      placeholder="8814310515..."
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="shop-field-group full-width">
                  <label className="shop-form-label">Tên chủ tài khoản (in hoa không dấu) <span className="req">*</span></label>
                  <input
                    type="text"
                    name="bankAccountName"
                    className="shop-form-input"
                    placeholder="HOANG THIEN SON"
                    value={formData.bankAccountName}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Hợp đồng & Điều khoản Người bán */}
                <div className="shop-field-group full-width" style={{ marginTop: '0.75rem' }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.8rem',
                    color: '#334155'
                  }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <ShieldCheck size={16} color="#059669" />
                      Điều khoản Hợp đồng & Quy chế Người bán Cyber Mall:
                    </div>
                    <ul style={{ paddingLeft: '18px', margin: '4px 0', lineHeight: 1.55 }}>
                      <li><strong>Phí dịch vụ sàn:</strong> Tự động trích trừ <strong>2.5%</strong> trên doanh thu sản phẩm của mỗi đơn hàng giao thành công để làm phí vận hành sàn.</li>
                      <li><strong>Cước vận chuyển:</strong> Tiền ship (20.000đ/đơn) thuộc về đối tác vận chuyển, không tính vào doanh thu của shop.</li>
                      <li><strong>Chu kỳ quyết toán:</strong> Doanh thu được chốt và quyết toán định kỳ vào <strong>ngày 19 hàng tháng</strong>, hạn thanh toán giải ngân trong vòng <strong>2 ngày</strong> (đến hết ngày 21 hàng tháng).</li>
                      <li><strong>Số tiền nhận về:</strong> Là số tiền bán hàng thực tế sau khi đã tự động khấu trừ 2.5% phí sàn.</li>
                    </ul>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    <input
                      type="checkbox"
                      checked={agreedToContract}
                      onChange={(e) => setAgreedToContract(e.target.checked)}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2563eb' }}
                      required
                    />
                    <span>
                      Tôi đã đọc, hiểu rõ và đồng ý với Điều khoản Hợp đồng Người bán, chấp thuận để Sàn Cyber Mall tự động khấu trừ 2.5% phí sàn và thanh toán doanh thu định kỳ vào ngày 19 hàng tháng. <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="register-shop-footer">
                <button
                  type="button"
                  className="btn-shop-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-shop-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang kích hoạt cửa hàng...' : 'Đăng ký & Bắt đầu Bán hàng'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

