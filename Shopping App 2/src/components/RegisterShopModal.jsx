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
  ArrowRight
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
    logoUrl: ''
  });

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
        logoUrl: formData.logoUrl.trim() || undefined
      });

      // Cập nhật lại phiên đăng nhập để nhận vai trò SHOP_MANAGER
      await refreshUser();
      setSuccessShop(res);

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
