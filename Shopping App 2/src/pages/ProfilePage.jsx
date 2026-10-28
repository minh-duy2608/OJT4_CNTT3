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
  X,
  KeyRound,
  RotateCcw
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
    changePassword,
    forgotPassword,
    resetPassword,
    resendVerification,
    verifyEmail,
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

  // 2.1. Trạng thái Quên mật khẩu & Xác minh OTP 6 số (API 8 & API 9)
  const [showForgotOtpModal, setShowForgotOtpModal] = useState(false);
  const [forgotOtpCode, setForgotOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotModalType, setForgotModalType] = useState('confirm'); // 'confirm' (?) -> 'success' (✓)
  const [forgotResetSuccess, setForgotResetSuccess] = useState(false);
  const [forgotResetError, setForgotResetError] = useState(null);

  // 2.2. Trạng thái Xác minh Email qua mã OTP 6 số dưới Avatar (API 10 & API 11)
  const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
  const [verifyEmailOtpCode, setVerifyEmailOtpCode] = useState('');
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [verifyEmailCountdown, setVerifyEmailCountdown] = useState(0);
  const [verifyEmailModalType, setVerifyEmailModalType] = useState('confirm'); // 'confirm' (?) -> 'success' (✓)
  const [verifyEmailSuccess, setVerifyEmailSuccess] = useState(false);
  const [verifyEmailError, setVerifyEmailError] = useState(null);

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

  // Upload Avatar lên Cloudinary và lưu vào Backend
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const result = await uploadToCloudinary(file);
      await updateProfile({ avatar: result.url, avatarUrl: result.url });

      if (result.isCloudinary) {
        showAlert('Ảnh đại diện đã được lưu trữ trên Cloudinary và cập nhật tài khoản!', 'success');
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

  // Lưu thông tin cá nhân (API 6 - PATCH /auth/me)
  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setInfoTouched({ name: true, email: true, phone: true });

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);

    if (nameErr || emailErr || phoneErr) {
      showAlert('Vui lòng kiểm tra lại thông tin chưa hợp lệ.', 'error');
      return;
    }

    try {
      setIsSavingInfo(true);
      await updateProfile({ fullName: name.trim(), phone: phone.trim() });
      showAlert('Cập nhật thông tin tài khoản thành công (API 6)!', 'success');
    } catch (err) {
      showAlert(err.message || 'Cập nhật thông tin thất bại.', 'error');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Đổi mật khẩu (API 7 - PATCH /auth/me/password)
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordTouched({ current: true, new: true, confirm: true });

    const currErr = !currentPassword ? 'Vui lòng nhập mật khẩu hiện tại.' : null;
    const newErr = validateNewPassword(newPassword);
    const confErr = validateConfirmPassword(newPassword, confirmPassword);

    if (currErr || newErr || confErr) {
      showAlert('Vui lòng kiểm tra lại mật khẩu mới.', 'error');
      return;
    }

    try {
      setIsSavingPassword(true);
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTouched({ current: false, new: false, confirm: false });
      showAlert('Mật khẩu của bạn đã được thay đổi thành công (API 7)!', 'success');
    } catch (err) {
      showAlert(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Đếm ngược thời gian gửi lại mã OTP (Quên mật khẩu)
  useEffect(() => {
    let timer;
    if (forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCountdown]);

  // Đếm ngược thời gian gửi lại mã OTP (Xác minh email)
  useEffect(() => {
    let timer;
    if (verifyEmailCountdown > 0) {
      timer = setTimeout(() => setVerifyEmailCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [verifyEmailCountdown]);

  // Gửi mã OTP xác minh qua Email khi bấm "Quên mật khẩu" (API 8)
  const handleTriggerForgotPassword = async () => {
    const targetEmail = user?.email || email;
    if (!targetEmail) {
      showAlert('Không tìm thấy email của tài khoản để gửi mã xác thực.', 'error');
      return;
    }
    try {
      setIsSendingForgotOtp(true);
      const res = await forgotPassword(targetEmail);
      setForgotModalType('confirm');
      setForgotResetSuccess(false);
      setForgotResetError(null);
      setShowForgotOtpModal(true);
      setForgotCountdown(60);
      setForgotOtpCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      showAlert(res?.message || `Mã OTP 6 số đã được gửi từ son666727@gmail.com đến ${targetEmail}`, 'info');
    } catch (err) {
      showAlert(err.message || 'Không thể gửi mã OTP đặt lại mật khẩu. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsSendingForgotOtp(false);
    }
  };

  // Gửi lại mã OTP qua email (API 8)
  const handleResendForgotOtp = async () => {
    const targetEmail = user?.email || email;
    if (forgotCountdown > 0 || !targetEmail) return;
    try {
      setForgotResetError(null);
      const res = await forgotPassword(targetEmail);
      setForgotCountdown(60);
      showAlert(res?.message || 'Đã gửi lại mã OTP 6 số thành công!', 'info');
    } catch (err) {
      setForgotResetError(err.message || 'Lỗi khi gửi lại mã OTP.');
    }
  };

  // Xác nhận đặt lại mật khẩu mới bằng mã OTP 6 số (API 9)
  const handleConfirmResetPassword = async () => {
    setForgotResetError(null);
    const code = forgotOtpCode.trim();
    if (!code || code.length !== 6) {
      setForgotResetError('Vui lòng nhập đầy đủ mã xác minh OTP gồm 6 chữ số.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotResetError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotResetError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    try {
      setIsResettingPassword(true);
      await resetPassword({
        token: code,
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword
      });

      // Thành công: chuyển dấu hỏi chấm (?) thành dấu tích (✓)
      setForgotModalType('success');
      setForgotResetSuccess(true);
      setForgotResetError(null);
      showAlert('Đặt lại mật khẩu thành công! Mật khẩu mới đã được cập nhật.', 'success');

      // Tự động đóng modal sau 1.5 giây
      setTimeout(() => {
        setShowForgotOtpModal(false);
        setForgotResetSuccess(false);
        setForgotModalType('confirm');
        setForgotOtpCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        // Xóa form đổi mật khẩu hiện tại
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err) {
      setForgotResetError(err.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // =========================================================================
  // XÁC MINH EMAIL DƯỚI AVATAR (API 10 & API 11)
  // =========================================================================

  // Mở modal xác minh Email
  const handleOpenVerifyEmailModal = () => {
    const targetEmail = user?.email || email;
    if (!targetEmail) {
      showAlert('Không tìm thấy địa chỉ email tài khoản để xác minh.', 'error');
      return;
    }
    setVerifyEmailOtpCode('');
    setVerifyEmailError(null);
    setVerifyEmailModalType('confirm');
    setVerifyEmailSuccess(false);
    setShowVerifyEmailModal(true);
  };

  // Gửi lại mã OTP xác minh email (API 11)
  const handleResendVerifyEmailOtp = async () => {
    const targetEmail = user?.email || email;
    if (verifyEmailCountdown > 0 || !targetEmail) return;
    try {
      setVerifyEmailError(null);
      const res = await resendVerification(targetEmail);
      setVerifyEmailCountdown(60);
      showAlert(res?.message || 'Đã gửi lại mã OTP 6 số thành công!', 'info');
    } catch (err) {
      setVerifyEmailError(err.message || 'Lỗi khi gửi lại mã xác minh email.');
    }
  };

  // Xác nhận mã OTP để kích hoạt Email (API 10)
  const handleConfirmVerifyEmail = async () => {
    setVerifyEmailError(null);
    const code = verifyEmailOtpCode.trim();
    if (!code || code.length !== 6) {
      setVerifyEmailError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    try {
      setIsVerifyingEmailOtp(true);
      await verifyEmail(code);

      // Thành công: chuyển dấu hỏi chấm (?) thành dấu tích (✓)
      setVerifyEmailModalType('success');
      setVerifyEmailSuccess(true);
      setVerifyEmailError(null);
      showAlert('Xác minh tài khoản email thành công (API 10)!', 'success');

      // Tự động đóng modal sau 1.5 giây
      setTimeout(() => {
        setShowVerifyEmailModal(false);
        setVerifyEmailSuccess(false);
        setVerifyEmailModalType('confirm');
        setVerifyEmailOtpCode('');
      }, 1500);
    } catch (err) {
      console.error('Verify email failed:', err);
      const msg = err.message || 'Mã xác minh OTP không chính xác hoặc đã hết hạn.';
      setVerifyEmailError(msg);
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Mở form thêm địa chỉ
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrFullName(user?.fullName || user?.name || '');
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
    setAddrFullName(addr.fullName || addr.recipientName || '');
    setAddrPhone(addr.phone || '');
    setAddrDetail(addr.detailAddress || addr.addressDetail || '');
    setAddrCity(addr.city || addr.province || 'TP. Hồ Chí Minh');
    setAddrType(addr.type || 'home');
    setAddrIsDefault(Boolean(addr.isDefault));
    setAddrPhoneError('');
    setIsAddressFormOpen(true);
  };

  // Lưu địa chỉ (Thêm mới hoặc Cập nhật)
  const handleSaveAddress = async (e) => {
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
      isDefault: addresses.length === 0 ? true : addrIsDefault
    };

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, addrData);
        showAlert('Đã cập nhật địa chỉ thành công!', 'success');
      } else {
        await addAddress(addrData);
        showAlert('Đã thêm địa chỉ nhận hàng mới!', 'success');
      }
      setIsAddressFormOpen(false);
    } catch (err) {
      showAlert(err.message || 'Lỗi lưu thông tin địa chỉ.', 'error');
    }
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
          {user.username && (
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '-0.25rem 0 0.5rem' }}>
              @{user.username}
            </p>
          )}

          {/* Huy hiệu vai trò & Xác minh Email */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              backgroundColor: user.role === 'ROLE_ADMIN' ? '#fee2e2' : '#e0e7ff',
              color: user.role === 'ROLE_ADMIN' ? '#991b1b' : '#3730a3'
            }}>
              {user.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
            </span>

            <span
              onClick={!user.emailVerifiedAt ? handleOpenVerifyEmailModal : undefined}
              title={!user.emailVerifiedAt ? 'Bấm để xác minh email ngay' : 'Email đã xác minh'}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: user.emailVerifiedAt ? '#dcfce7' : '#fef3c7',
                color: user.emailVerifiedAt ? '#166534' : '#92400e',
                cursor: !user.emailVerifiedAt ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {user.emailVerifiedAt ? '✓ Email đã xác minh' : 'Chưa xác minh email'}
            </span>
          </div>

          {!user.emailVerifiedAt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={handleOpenVerifyEmailModal}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '7px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Xác minh email ngay (Nhập OTP)</span>
              </button>

              <button
                type="button"
                onClick={handleResendVerifyEmailOtp}
                disabled={verifyEmailCountdown > 0}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: verifyEmailCountdown > 0 ? '#9ca3af' : '#4b5563',
                  fontWeight: 500,
                  cursor: verifyEmailCountdown > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {verifyEmailCountdown > 0 ? `Gửi lại sau (${verifyEmailCountdown}s)` : 'Gửi lại email xác minh (API 11)'}
              </button>
            </div>
          )}

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
                          onClick={async () => {
                            try {
                              await setDefaultAddress(addr.id);
                              showAlert('Đã đặt làm địa chỉ giao hàng mặc định duy nhất!', 'success');
                            } catch (err) {
                              showAlert(err.message || 'Lỗi thiết lập mặc định.', 'error');
                            }
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
                      <button
                        type="button"
                        className="address-action-btn delete"
                        onClick={() => setAddressToDelete(addr)}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
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
            <div className="form-box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-box-title-left">
                <ShieldCheck size={20} />
                <span>Bảo mật &amp; Mật khẩu</span>
              </div>
              <button
                type="button"
                onClick={handleTriggerForgotPassword}
                disabled={isSendingForgotOtp}
                style={{
                  background: 'none',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isSendingForgotOtp ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSendingForgotOtp ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang gửi mã...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Quên mật khẩu? (Nhận OTP)</span>
                  </>
                )}
              </button>
            </div>
            <p className="form-box-subtitle">
              Đổi mật khẩu định kỳ để bảo vệ tài khoản mua sắm của bạn. Nếu quên mật khẩu cũ, bạn có thể bấm <strong>"Quên mật khẩu?"</strong> để nhận mã OTP 6 số qua email.
            </p>

            <form onSubmit={handleChangePassword} className="profile-form-grid" noValidate>
              <div className="form-group profile-form-full">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" htmlFor="current-pwd" style={{ margin: 0 }}>
                    Mật khẩu hiện tại <span className="form-label-required">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleTriggerForgotPassword}
                    disabled={isSendingForgotOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: isSendingForgotOtp ? 'not-allowed' : 'pointer',
                      padding: 0
                    }}
                  >
                    {isSendingForgotOtp ? 'Đang gửi mã...' : 'Bạn quên mật khẩu hiện tại?'}
                  </button>
                </div>
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
        onConfirm={async () => {
          if (addressToDelete) {
            try {
              await deleteAddress(addressToDelete.id);
              setAddressToDelete(null);
              showAlert('Đã xóa địa chỉ thành công.', 'info');
            } catch (err) {
              showAlert(err.message || 'Lỗi xóa địa chỉ.', 'error');
            }
          }
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL QUÊN MẬT KHẨU & XÁC MINH OTP 6 SỐ TRÊN PROFILE (API 8 & 9) */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={showForgotOtpModal}
        onClose={() => setShowForgotOtpModal(false)}
        type={forgotModalType}
        title={forgotResetSuccess ? 'Đặt lại mật khẩu thành công!' : 'Xác minh OTP để đặt lại mật khẩu'}
        confirmText={isResettingPassword ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
        cancelText="Hủy bỏ"
        showCancel={!forgotResetSuccess}
        onConfirm={forgotResetSuccess ? null : handleConfirmResetPassword}
      >
        {forgotResetSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#15803d', marginBottom: '0.4rem' }}>
              ✓ Mật khẩu mới đã được cập nhật thành công!
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Cửa sổ xác minh sẽ tự động đóng lại...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {forgotResetError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{forgotResetError}</span>
              </div>
            )}

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.875rem',
              color: '#1e3a8a',
              lineHeight: 1.5
            }}>
              Hệ thống đã gửi mã xác minh gồm <strong>6 chữ số</strong> từ <code>son666727@gmail.com</code> đến:
              <div style={{ fontWeight: 700, color: '#1d4ed8', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {user?.email || email}
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Vui lòng kiểm tra Hộp thư đến (Inbox) hoặc Thư rác (Spam) để lấy mã.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                Nhập mã OTP 6 chữ số: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={forgotOtpCode}
                onChange={(e) => {
                  setForgotOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                  if (forgotResetError) setForgotResetError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmResetPassword();
                }}
                placeholder="••••••"
                autoFocus
                className="form-input"
                style={{
                  width: '100%',
                  fontSize: '26px',
                  letterSpacing: '10px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#1e293b',
                  padding: '0.6rem 0.5rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.35rem' }}>
                Mật khẩu mới (tối thiểu 6 ký tự): <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon-left" />
                <input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="form-input"
                  style={{ width: '100%' }}
                />
                <div className="input-icon-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                  >
                    {showForgotNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.35rem' }}>
                Xác nhận mật khẩu mới: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon-left" />
                <input
                  type={showForgotNewPassword ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="form-input"
                  style={{ width: '100%' }}
                />
                {forgotConfirmPassword && forgotNewPassword === forgotConfirmPassword && (
                  <div className="input-icon-right"><Check size={18} color="#10b981" strokeWidth={2.5} /></div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Chưa nhận được mã?</span>
              <button
                type="button"
                onClick={handleResendForgotOtp}
                disabled={forgotCountdown > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: forgotCountdown > 0 ? '#94a3b8' : '#2563eb',
                  fontWeight: 600,
                  cursor: forgotCountdown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RotateCcw size={13} />
                {forgotCountdown > 0 ? `Gửi lại sau (${forgotCountdown}s)` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* ========================================================================= */}
      {/* MODAL XÁC MINH EMAIL TÀI KHOẢN DƯỚI AVATAR (API 10 & 11) */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={showVerifyEmailModal}
        onClose={() => setShowVerifyEmailModal(false)}
        type={verifyEmailModalType}
        title={verifyEmailSuccess ? 'Xác minh email thành công!' : 'Xác minh tài khoản qua Email'}
        confirmText={isVerifyingEmailOtp ? "Đang kiểm tra..." : "Xác nhận mã OTP"}
        cancelText="Đóng"
        showCancel={!verifyEmailSuccess}
        onConfirm={verifyEmailSuccess ? null : handleConfirmVerifyEmail}
      >
        {verifyEmailSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#15803d', marginBottom: '0.4rem' }}>
              ✓ Email tài khoản của bạn đã được kích hoạt thành công!
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Hồ sơ của bạn đã được cập nhật huy hiệu xác minh...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {verifyEmailError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{verifyEmailError}</span>
              </div>
            )}

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.875rem',
              color: '#1e3a8a',
              lineHeight: 1.5
            }}>
              Hệ thống đã gửi một mã xác minh gồm <strong>6 chữ số</strong> từ <code>son666727@gmail.com</code> đến:
              <div style={{ fontWeight: 700, color: '#1d4ed8', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                {user?.email || email}
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Vui lòng kiểm tra Hộp thư đến (Inbox) hoặc Thư rác (Spam) để lấy mã kích hoạt.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                Nhập mã OTP 6 chữ số: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={verifyEmailOtpCode}
                onChange={(e) => {
                  setVerifyEmailOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                  if (verifyEmailError) setVerifyEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmVerifyEmail();
                }}
                placeholder="••••••"
                autoFocus
                className="form-input"
                style={{
                  width: '100%',
                  fontSize: '26px',
                  letterSpacing: '10px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#1e293b',
                  padding: '0.6rem 0.5rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Chưa nhận được mã?</span>
              <button
                type="button"
                onClick={handleResendVerifyEmailOtp}
                disabled={verifyEmailCountdown > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: verifyEmailCountdown > 0 ? '#94a3b8' : '#2563eb',
                  fontWeight: 600,
                  cursor: verifyEmailCountdown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <RotateCcw size={13} />
                {verifyEmailCountdown > 0 ? `Gửi lại sau (${verifyEmailCountdown}s)` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </div>
        )}
      </ConfirmModal>

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
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: addresses.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={addrIsDefault || addresses.length === 0}
                      disabled={addresses.length === 0}
                      onChange={(e) => setAddrIsDefault(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#000', cursor: addresses.length === 0 ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: '#18181b' }}>
                      Đặt làm địa chỉ nhận hàng mặc định {addresses.length === 0 ? '(Mặc định cho địa chỉ đầu tiên)' : ''}
                    </span>
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
