import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CloudUpload,
  ShieldCheck,
  Check,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Home,
  Briefcase,
  Package,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary } from '../services/cloudinary';
import {
  validateName,
  validateEmail,
  validatePhone,
  getPasswordStrength,
  validateNewPassword,
  validateConfirmPassword
} from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import './ProfilePage.css';

export const ProfilePage = () => {
  const {
    user,
    isAuthenticated,
    updateProfile,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 1. Trạng thái Form thông tin cá nhân
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [infoTouched, setInfoTouched] = useState({ name: false, email: false, phone: false });
  const [infoErrors, setInfoErrors] = useState({});

  // 2. Trạng thái Form đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState({ current: false, new: false, confirm: false });
  const [passwordErrors, setPasswordErrors] = useState({});

  // 3. Trạng thái Thêm / Sửa địa chỉ nhận hàng
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrCity, setAddrCity] = useState('TP. Hồ Chí Minh');
  const [addrType, setAddrType] = useState('home');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrPhoneError, setAddrPhoneError] = useState('');
  const [addressToDelete, setAddressToDelete] = useState(null);

  // 4. Trạng thái Upload & Alert
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [isAuthenticated, user, navigate]);

  // Đóng modal thêm địa chỉ khi bấm phím ESC & khóa cuộn trang
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAddressFormOpen) {
        setIsAddressFormOpen(false);
      }
    };
    if (isAddressFormOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddressFormOpen]);

  // Validation Info
  useEffect(() => {
    const errors = {};
    if (infoTouched.name) {
      const err = validateName(name);
      if (err) errors.name = err;
    }
    if (infoTouched.email) {
      const err = validateEmail(email);
      if (err) errors.email = err;
    }
    if (infoTouched.phone) {
      const err = validatePhone(phone);
      if (err) errors.phone = err;
    }
    setInfoErrors(errors);
  }, [name, email, phone, infoTouched]);

  // Validation Password
  useEffect(() => {
    const errors = {};
    if (passwordTouched.current && !currentPassword) {
      errors.current = 'Vui lòng nhập mật khẩu hiện tại.';
    }
    if (passwordTouched.new) {
      const err = validateNewPassword(newPassword);
      if (err) errors.new = err;
    }
    if (passwordTouched.confirm) {
      const err = validateConfirmPassword(newPassword, confirmPassword);
      if (err) errors.confirm = err;
    }
    setPasswordErrors(errors);
  }, [currentPassword, newPassword, confirmPassword, passwordTouched]);

  const showAlert = (message, type = 'success') => {
    setAlertInfo({ message, type });
    setTimeout(() => {
      setAlertInfo(null);
    }, 4500);
  };

  // Upload Avatar lên Cloudinary
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const result = await uploadToCloudinary(file);
      updateProfile({ avatar: result.url });

      if (result.isCloudinary) {
        showAlert('Ảnh đại diện đã được lưu trữ vĩnh viễn trên Cloudinary!', 'success');
      } else {
        showAlert(result.warning || 'Ảnh đại diện đã được cập nhật!', 'success');
      }
    } catch (error) {
      console.error(error);
      showAlert(error.message || 'Không thể tải ảnh lên Cloudinary.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lưu thông tin cá nhân
  const handleSavePersonalInfo = (e) => {
    e.preventDefault();
    setInfoTouched({ name: true, email: true, phone: true });

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);

    if (nameErr || emailErr || phoneErr) {
      showAlert('Vui lòng kiểm tra lại thông tin chưa hợp lệ.', 'error');
      return;
    }

    setIsSavingInfo(true);
    setTimeout(() => {
      updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      setIsSavingInfo(false);
      showAlert('Cập nhật thông tin tài khoản thành công!', 'success');
    }, 400);
  };

  // Đổi mật khẩu
  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordTouched({ current: true, new: true, confirm: true });

    const currErr = !currentPassword ? 'Vui lòng nhập mật khẩu hiện tại.' : null;
    const newErr = validateNewPassword(newPassword);
    const confErr = validateConfirmPassword(newPassword, confirmPassword);

    if (currErr || newErr || confErr) {
      showAlert('Vui lòng kiểm tra lại mật khẩu mới.', 'error');
      return;
    }

    setIsSavingPassword(true);
    setTimeout(() => {
      setIsSavingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTouched({ current: false, new: false, confirm: false });
      showAlert('Mật khẩu của bạn đã được thay đổi thành công!', 'success');
    }, 500);
  };

  // Mở form thêm địa chỉ
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrFullName(user?.name || '');
    setAddrPhone(user?.phone || '');
    setAddrDetail('');
    setAddrCity('TP. Hồ Chí Minh');
    setAddrType('home');
    setAddrIsDefault(addresses.length === 0);
    setAddrPhoneError('');
    setIsAddressFormOpen(true);
  };

  // Mở form sửa địa chỉ
  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddrFullName(addr.fullName);
    setAddrPhone(addr.phone);
    setAddrDetail(addr.detailAddress);
    setAddrCity(addr.city);
    setAddrType(addr.type || 'home');
    setAddrIsDefault(addr.isDefault || false);
    setAddrPhoneError('');
    setIsAddressFormOpen(true);
  };

  // Lưu địa chỉ (Thêm mới hoặc Cập nhật)
  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (!addrFullName.trim() || !addrPhone.trim() || !addrDetail.trim()) {
      showAlert('Vui lòng điền đầy đủ họ tên, SĐT và địa chỉ chi tiết.', 'error');
      return;
    }

    // Kiểm tra validate số điện thoại phải là đúng 10 số
    const phoneError = validatePhone(addrPhone);
    if (phoneError) {
      setAddrPhoneError(phoneError);
      showAlert(phoneError, 'error');
      return;
    }

    const addrData = {
      fullName: addrFullName.trim(),
      phone: addrPhone.trim(),
      detailAddress: addrDetail.trim(),
      city: addrCity.trim(),
      type: addrType,
      isDefault: addrIsDefault
    };

    if (editingAddressId) {
      updateAddress(editingAddressId, addrData);
      showAlert('Đã cập nhật địa chỉ thành công!', 'success');
    } else {
      addAddress(addrData);
      showAlert('Đã thêm địa chỉ nhận hàng mới!', 'success');
    }

    setIsAddressFormOpen(false);
  };

  if (!user) return null;

  const passwordStrength = getPasswordStrength(newPassword);
  const isCloudinaryConfigured = Boolean(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME &&
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  );

  return (
    <div className="container profile-page-wrapper">
      {/* Header trang */}
      <div className="profile-header">
        <h1 className="profile-title">Thông tin tài khoản</h1>
        <p className="profile-subtitle">
          Quản lý thông tin hồ sơ, địa chỉ nhận hàng và bảo mật tài khoản Cyber của bạn.
        </p>
      </div>

      {/* Thông báo Alert */}
      {alertInfo && (
        <div className={`profile-alert ${alertInfo.type}`} role="alert">
          {alertInfo.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alertInfo.message}</span>
        </div>
      )}

      <div className="profile-grid-layout">
        {/* ================= CỘT TRÁI: AVATAR & TỔNG QUAN ================= */}
        <aside className="profile-sidebar-card">
          <div className="avatar-upload-container">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}
              alt={user.name}
              className="avatar-img-preview"
            />

            <button
              type="button"
              className="avatar-upload-overlay"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Đổi ảnh đại diện"
              title="Đổi ảnh đại diện"
            >
              <Camera size={19} />
            </button>

            {isUploadingAvatar && (
              <div className="avatar-loading-overlay">
                <Loader2 size={24} className="animate-spin" />
                <span>Cloudinary...</span>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="avatar-upload-text-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? 'Đang gửi lên Cloudinary...' : 'Thay đổi ảnh đại diện'}
          </button>

          <h2 className="profile-card-name">{user.name}</h2>
          <p className="profile-card-email">{user.email}</p>

          {/* Trạng thái Cloudinary */}
          <div className="cloudinary-status-card">
            <div className="cloudinary-badge-title">
              <CloudUpload size={16} color={isCloudinaryConfigured ? '#10b981' : '#f59e0b'} />
              <span>Dịch vụ lưu trữ Cloudinary</span>
            </div>
            {isCloudinaryConfigured ? (
              <p style={{ color: '#059669', margin: 0 }}>
                ✓ Đã kết nối Cloudinary: <strong>{import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}</strong>
              </p>
            ) : (
              <p style={{ color: '#d97706', margin: 0 }}>
                Chưa điền <code>.env</code>. Ảnh đại diện đang lưu tạm thời cục bộ.
              </p>
            )}
          </div>

          {/* Shortcut đến trang Đơn hàng */}
          <div style={{ marginTop: '1.25rem', width: '100%' }}>
            <Link
              to="/orders"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#000000',
                color: '#ffffff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              <Package size={16} />
              <span>Xem đơn hàng của tôi</span>
            </Link>
          </div>
        </aside>

        {/* ================= CỘT PHẢI: FORMS CÁ NHÂN, ĐỊA CHỈ & MẬT KHẨU ================= */}
        <section className="profile-content-col">
          {/* 1. Form thông tin cá nhân */}
          <div className="profile-form-box">
            <div className="form-box-title">
              <div className="form-box-title-left">
                <User size={20} />
                <span>Thông tin cá nhân</span>
              </div>
            </div>
            <p className="form-box-subtitle">
              Cập nhật tên hiển thị, địa chỉ email và số điện thoại liên lạc của bạn.
            </p>

            <form onSubmit={handleSavePersonalInfo} className="profile-form-grid" noValidate>
              <div className="form-group profile-form-full">
                <label className="form-label" htmlFor="user-name">
                  Họ và tên <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon-left" />
                  <input
                    id="user-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setInfoTouched((prev) => ({ ...prev, name: true }))}
                    placeholder="VD: Hoàng Sơn"
                    className={`form-input ${infoTouched.name ? (infoErrors.name ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  {infoTouched.name && !infoErrors.name && (
                    <div className="input-icon-right"><Check size={18} color="#10b981" strokeWidth={2.5} /></div>
                  )}
                </div>
                {infoTouched.name && infoErrors.name && (
                  <span className="form-error-msg"><AlertCircle size={14} />{infoErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-email">
                  Địa chỉ Email <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon-left" />
                  <input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setInfoTouched((prev) => ({ ...prev, email: true }))}
                    placeholder="VD: son666727@gmail.com"
                    className={`form-input ${infoTouched.email ? (infoErrors.email ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  {infoTouched.email && !infoErrors.email && (
                    <div className="input-icon-right"><Check size={18} color="#10b981" strokeWidth={2.5} /></div>
                  )}
                </div>
                {infoTouched.email && infoErrors.email && (
                  <span className="form-error-msg"><AlertCircle size={14} />{infoErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-phone">
                  Số điện thoại <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon-left" />
                  <input
                    id="user-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setInfoTouched((prev) => ({ ...prev, phone: true }))}
                    placeholder="VD: 0362490374"
                    className={`form-input ${infoTouched.phone ? (infoErrors.phone ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  {infoTouched.phone && !infoErrors.phone && (
                    <div className="input-icon-right"><Check size={18} color="#10b981" strokeWidth={2.5} /></div>
                  )}
                </div>
                {infoTouched.phone && infoErrors.phone && (
                  <span className="form-error-msg"><AlertCircle size={14} />{infoErrors.phone}</span>
                )}
              </div>

              <div className="profile-form-full">
                <button type="submit" className="profile-save-btn" disabled={isSavingInfo}>
                  {isSavingInfo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang lưu thông tin...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi thông tin</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 2. QUẢN LÝ ĐỊA CHỈ NHẬN HÀNG (Đúng yêu cầu: có thể thêm nhiều, chọn 1 mặc định) */}
          <div className="profile-form-box">
            <div className="form-box-title">
              <div className="form-box-title-left">
                <MapPin size={20} />
                <span>Địa chỉ nhận hàng</span>
              </div>

            </div>
            <p className="form-box-subtitle">
              Quản lý các địa chỉ giao hàng của bạn. Bạn có thể chọn 1 địa chỉ làm mặc định khi đặt hàng.
            </p>

            {/* Nếu chưa có địa chỉ nào */}
            {addresses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#fafafa', borderRadius: '12px', border: '1.5px dashed #d4d4d8' }}>
                <MapPin size={36} color="#a1a1aa" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#18181b' }}>Bạn chưa có địa chỉ nhận hàng</h4>
                <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Hãy thêm địa chỉ giao hàng để đặt mua các sản phẩm công nghệ nhanh chóng hơn.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={handleOpenAddAddress}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Thêm địa chỉ nhận hàng
                </button>
              </div>
            ) : (
              <div className="addresses-list">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`address-item-card ${addr.isDefault ? 'is-default' : ''}`}
                  >
                    <div className="address-card-header">
                      <div className="address-name-group">
                        <span className="address-person-name">{addr.fullName}</span>
                        <span className="address-phone-number">({addr.phone})</span>
                      </div>

                      <div className="address-badges-group">
                        {addr.isDefault && (
                          <span className="badge-default">Mặc định</span>
                        )}
                        <span className="badge-tag">
                          {addr.type === 'office' ? (
                            <>
                              <Briefcase size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              Văn phòng
                            </>
                          ) : (
                            <>
                              <Home size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              Nhà riêng
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="address-detail-text">
                      {addr.detailAddress}, {addr.city}
                    </p>

                    <div className="address-actions-row">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          className="address-action-btn set-default"
                          onClick={() => {
                            setDefaultAddress(addr.id);
                            showAlert('Đã đặt làm địa chỉ giao hàng mặc định!', 'success');
                          }}
                        >
                          Thiết lập mặc định
                        </button>
                      )}
                      <button
                        type="button"
                        className="address-action-btn"
                        onClick={() => handleOpenEditAddress(addr)}
                      >
                        <Edit3 size={14} /> Chỉnh sửa
                      </button>
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          className="address-action-btn delete"
                          onClick={() => setAddressToDelete(addr)}
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Thẻ viền nét đứt thêm nhanh địa chỉ */}
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="address-add-dashed-card"
                  style={{
                    width: '100%',
                    padding: '1.1rem',
                    borderRadius: '10px',
                    border: '1.5px dashed #cbd5e1',
                    background: '#fafafa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    marginTop: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={16} />
                  <span>Thêm địa chỉ nhận hàng mới</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Form đổi mật khẩu */}
          <div className="profile-form-box">
            <div className="form-box-title">
              <div className="form-box-title-left">
                <ShieldCheck size={20} />
                <span>Bảo mật &amp; Mật khẩu</span>
              </div>
            </div>
            <p className="form-box-subtitle">
              Đổi mật khẩu định kỳ để bảo vệ tài khoản mua sắm của bạn an toàn nhất.
            </p>

            <form onSubmit={handleChangePassword} className="profile-form-grid" noValidate>
              <div className="form-group profile-form-full">
                <label className="form-label" htmlFor="current-pwd">
                  Mật khẩu hiện tại <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon-left" />
                  <input
                    id="current-pwd"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onBlur={() => setPasswordTouched((prev) => ({ ...prev, current: true }))}
                    placeholder="Nhập mật khẩu hiện tại"
                    className={`form-input ${passwordTouched.current ? (passwordErrors.current ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  <div className="input-icon-right">
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                      aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>
                {passwordTouched.current && passwordErrors.current && (
                  <span className="form-error-msg"><AlertCircle size={14} />{passwordErrors.current}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">
                  Mật khẩu mới <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon-left" />
                  <input
                    id="new-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => setPasswordTouched((prev) => ({ ...prev, new: true }))}
                    placeholder="Tối thiểu 6 ký tự"
                    className={`form-input ${passwordTouched.new ? (passwordErrors.new ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  <div className="input-icon-right">
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                      aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                {newPassword && (
                  <div className="password-strength-wrapper">
                    <div className="password-strength-track">
                      <div className="password-strength-bar" style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }} />
                    </div>
                    <div className="password-strength-text" style={{ color: passwordStrength.color }}>
                      <span>Độ mạnh:</span>
                      <span>{passwordStrength.label}</span>
                    </div>
                  </div>
                )}

                {passwordTouched.new && passwordErrors.new && (
                  <span className="form-error-msg"><AlertCircle size={14} />{passwordErrors.new}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-pwd">
                  Xác nhận mật khẩu mới <span className="form-label-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon-left" />
                  <input
                    id="confirm-pwd"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setPasswordTouched((prev) => ({ ...prev, confirm: true }))}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`form-input ${passwordTouched.confirm ? (passwordErrors.confirm ? 'is-invalid' : 'is-valid') : ''}`}
                  />
                  {passwordTouched.confirm && !passwordErrors.confirm && confirmPassword && (
                    <div className="input-icon-right"><Check size={18} color="#10b981" strokeWidth={2.5} /></div>
                  )}
                </div>
                {passwordTouched.confirm && passwordErrors.confirm && (
                  <span className="form-error-msg"><AlertCircle size={14} />{passwordErrors.confirm}</span>
                )}
              </div>

              <div className="profile-form-full">
                <button type="submit" className="profile-save-btn" disabled={isSavingPassword}>
                  {isSavingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang cập nhật mật khẩu...</span>
                    </>
                  ) : (
                    <span>Cập nhật mật khẩu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* MODEL BOX: XÁC NHẬN XÓA ĐỊA CHỈ */}
      <ConfirmModal
        isOpen={Boolean(addressToDelete)}
        onClose={() => setAddressToDelete(null)}
        type="danger"
        title="Xác nhận xóa địa chỉ"
        message={addressToDelete ? `Bạn có chắc chắn muốn xóa địa chỉ của "${addressToDelete.fullName}" (${addressToDelete.detailAddress}, ${addressToDelete.city}) khỏi sổ địa chỉ không?` : ''}
        confirmText="Xóa địa chỉ"
        cancelText="Hủy bỏ"
        onConfirm={() => {
          if (addressToDelete) {
            deleteAddress(addressToDelete.id);
            setAddressToDelete(null);
            showAlert('Đã xóa địa chỉ thành công.', 'info');
          }
        }}
      />

      {/* MODEL BOX: THÊM / CHỈNH SỬA ĐỊA CHỈ NHẬN HÀNG */}
      {isAddressFormOpen && (
        <div
          className="address-modal-backdrop"
          onClick={() => setIsAddressFormOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="address-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="address-modal-header">
              <div className="address-modal-header-left">
                <div className="address-modal-icon-badge">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="address-modal-title">
                    {editingAddressId ? 'Chỉnh sửa địa chỉ nhận hàng' : 'Thêm địa chỉ nhận hàng mới'}
                  </h3>
                  <p className="address-modal-subtitle">
                    Nhập thông tin người nhận để Cyber giao hàng chuẩn xác nhất.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="address-modal-close-btn"
                onClick={() => setIsAddressFormOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAddress}>
              <div className="address-modal-body">
                <div className="profile-form-grid" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Họ và tên người nhận <span className="form-label-required">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addrFullName}
                      onChange={(e) => setAddrFullName(e.target.value)}
                      placeholder="VD: Hoàng Sơn"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Số điện thoại (10 chữ số) <span className="form-label-required">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={addrPhone}
                      onChange={(e) => {
                        setAddrPhone(e.target.value);
                        if (addrPhoneError) setAddrPhoneError(validatePhone(e.target.value) || '');
                      }}
                      onBlur={() => setAddrPhoneError(validatePhone(addrPhone) || '')}
                      placeholder="VD: 0362490374"
                      className={`form-input ${addrPhoneError ? 'has-error' : ''}`}
                      maxLength={11}
                    />
                    {addrPhoneError && (
                      <span className="form-error-msg" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                        <AlertCircle size={13} /> {addrPhoneError}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Tỉnh / Thành phố <span className="form-label-required">*</span>
                    </label>
                    <select
                      className="form-input"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      required
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                      <option value="Khác">Tỉnh thành khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Loại địa chỉ</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setAddrType('home')}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          borderRadius: '8px',
                          border: addrType === 'home' ? '2px solid #000' : '1px solid #d4d4d8',
                          background: addrType === 'home' ? '#000' : '#fff',
                          color: addrType === 'home' ? '#fff' : '#000',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Home size={14} /> Nhà riêng
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddrType('office')}
                        style={{
                          flex: 1,
                          padding: '0.55rem',
                          borderRadius: '8px',
                          border: addrType === 'office' ? '2px solid #000' : '1px solid #d4d4d8',
                          background: addrType === 'office' ? '#000' : '#fff',
                          color: addrType === 'office' ? '#fff' : '#000',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Briefcase size={14} /> Văn phòng
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">
                    Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) <span className="form-label-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addrDetail}
                    onChange={(e) => setAddrDetail(e.target.value)}
                    placeholder="VD: Số 12, Đường Nguyễn Văn Cừ, Phường 4, Quận 5"
                    className="form-input"
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={addrIsDefault}
                      onChange={(e) => setAddrIsDefault(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: '#18181b' }}>Đặt làm địa chỉ nhận hàng mặc định</span>
                  </label>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="address-modal-footer">
                <button
                  type="button"
                  className="cyber-modal-btn btn-cancel"
                  onClick={() => setIsAddressFormOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="cyber-modal-btn btn-primary"
                >
                  {editingAddressId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
