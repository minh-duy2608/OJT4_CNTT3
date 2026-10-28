import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  Package, 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Phone,
  AlertCircle, 
  Check, 
  Loader2,
  KeyRound,
  ShieldCheck,
  Send,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { validateName, validateEmail, validatePhone } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import loginDeskImg from '../assets/login-desk.png';
import './AuthPage.css';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const isRegisterParam = searchParams.get('mode') === 'register';
  const verifyTokenParam = searchParams.get('token') || searchParams.get('verify_token');

  const [isRegister, setIsRegister] = useState(isRegisterParam);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);

  // 6-digit OTP Verification Modal (API 10 & 11)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Modals for Forgot Password and Reset Password
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessData, setForgotSuccessData] = useState(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Validation state
  const [touched, setTouched] = useState({ name: false, email: false, password: false, phone: false });
  const [errors, setErrors] = useState({});

  const { 
    login, 
    register, 
    forgotPassword, 
    resetPassword, 
    verifyEmail, 
    resendVerification, 
    isAuthenticated 
  } = useAuth();

  const { cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setIsRegister(searchParams.get('mode') === 'register');
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/products');
    }
  }, [isAuthenticated, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Handle direct verification link: ?token=...
  useEffect(() => {
    if (verifyTokenParam) {
      const handleAutoVerify = async () => {
        try {
          setIsLoading(true);
          await verifyEmail(verifyTokenParam);
          setApiSuccess('Xác minh địa chỉ email thành công! Bạn có thể đăng nhập ngay bây giờ.');
        } catch (err) {
          setApiError(err.message || 'Mã xác minh không hợp lệ hoặc đã hết hạn.');
        } finally {
          setIsLoading(false);
        }
      };
      handleAutoVerify();
    }
  }, [verifyTokenParam]);

  // Realtime validate
  useEffect(() => {
    const errs = {};
    if (isRegister && touched.name) {
      const err = validateName(name);
      if (err) errs.name = err;
    }
    if (touched.email) {
      const err = validateEmail(email);
      if (err) errs.email = err;
    }
    if (touched.password && !password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    } else if (touched.password && password.length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (isRegister && touched.phone && phone) {
      const pErr = validatePhone(phone);
      if (pErr) errs.phone = pErr;
    }
    setErrors(errs);
  }, [name, email, password, phone, isRegister, touched]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);
    setTouched({ name: true, email: true, password: true, phone: true });

    const nameErr = isRegister ? validateName(name) : null;
    const emailErr = validateEmail(email);
    const pwdErr = !password ? 'Vui lòng nhập mật khẩu.' : (password.length < 6 ? 'Mật khẩu phải có ít nhất 6 ký tự.' : null);

    if (nameErr || emailErr || pwdErr) {
      setErrors({
        ...(nameErr && { name: nameErr }),
        ...(emailErr && { email: emailErr }),
        ...(pwdErr && { password: pwdErr })
      });
      return;
    }

    try {
      setIsLoading(true);
      if (isRegister) {
        const generatedUsername = username.trim() || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Math.floor(100 + Math.random() * 900);
        await register({
          username: generatedUsername,
          email: email.trim(),
          password,
          fullName: name.trim() || 'Khách hàng',
          phone: phone.trim() || null
        });

        // Open 6-digit OTP Verification Modal
        setRegisteredEmail(email.trim());
        setOtpCode('');
        setShowOtpModal(true);
        setResendCountdown(60);
        setApiSuccess(`Mã xác minh 6 số đã được gửi từ son666727@gmail.com đến ${email.trim()}`);
      } else {
        await login({
          username: email.trim(),
          password
        });
        navigate('/products');
      }
    } catch (err) {
      setApiError(err.message || 'Thao tác không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit 6-digit OTP verification code (API 10)
  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      alert('Vui lòng nhập đầy đủ 6 chữ số mã xác minh.');
      return;
    }
    try {
      setIsVerifyingOtp(true);
      await verifyEmail(cleanCode);
      setShowOtpModal(false);
      setApiSuccess('Xác minh tài khoản thành công! Vui lòng đăng nhập với mật khẩu vừa tạo.');
      setIsRegister(false);
    } catch (err) {
      alert(err.message || 'Mã xác minh 6 chữ số không chính xác hoặc đã hết hạn.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend 6-digit OTP (API 11)
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    const target = registeredEmail || email;
    if (!target) return;
    try {
      const res = await resendVerification(target);
      alert(res?.message || `Đã gửi lại mã xác minh 6 số từ son666727@gmail.com đến ${target}.`);
      setResendCountdown(60);
    } catch (err) {
      alert(err.message || 'Không thể gửi lại mã xác minh.');
    }
  };

  // Handle Forgot Password Submit (API 8)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      setForgotLoading(true);
      const res = await forgotPassword(forgotEmail.trim());
      setForgotSuccessData(res);
      if (res?.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Reset Password Submit (API 9)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken || !resetNewPassword || !resetConfirmPassword) {
      alert('Vui lòng điền đầy đủ các thông tin.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      alert('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    try {
      setResetLoading(true);
      await resetPassword({
        token: resetToken.trim(),
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword
      });
      setShowResetModal(false);
      setShowForgotModal(false);
      setApiSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
      setIsRegister(false);
    } catch (err) {
      alert(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setResetLoading(false);
    }
  };

  const dynamicCartNotice = cartCount > 0 
    ? `${cartCount} sản phẩm trong giỏ hàng vẫn được giữ lại.` 
    : 'Sản phẩm trong giỏ hàng vẫn được lưu lại an toàn.';

  return (
    <div className="auth-container-wrapper">
      <div className="auth-card-layout">
        {/* ==================== CỘT TRÁI: ẢNH VÀ THÔNG ĐIỆP ==================== */}
        <aside className="auth-left-card">
          <div className="auth-image-box">
            <img 
              src={loginDeskImg} 
              alt="Bàn làm việc tối giản Nối" 
              className="auth-desk-image" 
            />
          </div>
          <div className="auth-info-box">
            <span className="auth-tagline">MỘT TÀI KHOẢN. MỌI KẾT NỐI.</span>
            <h2 className="auth-info-heading">
              Chào bạn trở lại với những điều thiết yếu.
            </h2>
            <p className="auth-info-desc">
              Hệ thống xác thực Microservice bảo mật cao. Mã xác thực 6 số gửi trực tiếp từ <strong>son666727@gmail.com</strong> để kích hoạt tài khoản an toàn.
            </p>
          </div>
        </aside>

        {/* ==================== CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ ==================== */}
        <section className="auth-right-col">
          <span className="auth-top-badge">TÀI KHOẢN NỐI (IAM AUTH)</span>
          
          <h1 className="auth-main-title">
            {isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </h1>
          
          <p className="auth-main-subtitle">
            {isRegister 
              ? 'Tạo tài khoản khách hàng để đồng bộ thiết bị và lưu lịch sử mua sắm.'
              : `Đăng nhập để tiếp tục thanh toán. ${dynamicCartNotice}`
            }
          </p>

          {/* Alert Message */}
          {apiError && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} />
              <span>{apiError}</span>
            </div>
          )}

          {apiSuccess && (
            <div style={{
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Check size={18} />
              <span>{apiSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="name-input">
                    Họ và tên <span className="form-label-required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon-left" />
                    <input
                      id="name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                      placeholder="Nguyễn Văn A"
                      className={`form-input ${
                        touched.name 
                          ? errors.name 
                            ? 'is-invalid' 
                            : 'is-valid' 
                          : ''
                      }`}
                    />
                    {touched.name && !errors.name && (
                      <div className="input-icon-right">
                        <Check size={18} color="#10b981" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                  {touched.name && errors.name && (
                    <span className="form-error-msg">
                      <AlertCircle size={14} />
                      {errors.name}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone-input">
                    Số điện thoại
                  </label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon-left" />
                    <input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="form-input"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                {isRegister ? 'Địa chỉ Email nhận mã' : 'Email hoặc Tên đăng nhập'} <span className="form-label-required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon-left" />
                <input
                  id="email-input"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder={isRegister ? "Duy2608@gmail.com" : "Duy2608@gmail.com hoặc username"}
                  className={`form-input ${
                    touched.email 
                      ? errors.email 
                        ? 'is-invalid' 
                        : 'is-valid' 
                      : ''
                  }`}
                />
                {touched.email && !errors.email && (
                  <div className="input-icon-right">
                    <Check size={18} color="#10b981" strokeWidth={2.5} />
                  </div>
                )}
              </div>
              {touched.email && errors.email && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password-input">
                Mật khẩu <span className="form-label-required">*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon-left" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder="••••••••••"
                  className={`form-input ${
                    touched.password 
                      ? errors.password 
                        ? 'is-invalid' 
                        : 'is-valid' 
                      : ''
                  }`}
                />
                <div className="input-icon-right">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>
              {touched.password && errors.password && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.password}
                </span>
              )}
            </div>

            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              {!isRegister && (
                <a 
                  href="#forgot" 
                  className="auth-forgot-link" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    setForgotEmail(email);
                    setForgotSuccessData(null);
                    setShowForgotModal(true); 
                  }}
                >
                  Quên mật khẩu?
                </a>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <>
                  <span>{isRegister ? 'Tạo tài khoản & Bắt đầu' : 'Đăng nhập & Tiếp tục'}</span>
                  <ArrowUpRight className="auth-submit-arrow" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                setIsRegister(!isRegister);
                setApiError(null);
                setApiSuccess(null);
              }}
              style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký tài khoản mới'}
            </button>
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setRegisteredEmail(email);
                setOtpCode('');
                setShowOtpModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b5563',
                fontSize: '0.8125rem',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Nhập mã xác minh email (6 số OTP)
            </button>
          </div>

          <div className="auth-guest-box">
            <div className="guest-box-header">
              <Package className="guest-box-icon" />
              <span>Chỉ muốn xem thêm?</span>
            </div>
            <p className="guest-box-text">
              Bạn có thể duyệt và tìm sản phẩm mà không cần tài khoản. Đăng nhập chỉ bắt buộc khi đặt hàng và xem lịch sử mua.
            </p>
            <Link to="/products" className="guest-box-link">
              <ArrowLeft size={14} />
              <span>Tiếp tục mua sắm</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODAL XÁC MINH OTP 6 SỐ TỪ GMAIL (API 10 & API 11) */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        type="info"
        title="Xác minh tài khoản qua Email"
        confirmText={isVerifyingOtp ? "Đang kiểm tra..." : "Xác nhận mã OTP"}
        cancelText="Để sau"
        showCancel={true}
        onConfirm={handleOtpSubmit}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.85rem',
            fontSize: '0.875rem',
            color: '#334155',
            lineHeight: 1.5
          }}>
            Hệ thống đã gửi một mã xác minh gồm <strong>6 chữ số</strong> từ <code>son666727@gmail.com</code> đến:
            <div style={{ fontWeight: 700, color: '#2563eb', marginTop: '0.25rem', fontSize: '0.95rem' }}>
              {registeredEmail || email || 'email của bạn'}
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Vui lòng kiểm tra Hộp thư đến (Inbox) hoặc Thư rác (Spam) để lấy mã.
            </p>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>
              Nhập mã 6 chữ số:
            </label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••••"
              autoFocus
              className="form-input"
              style={{
                width: '100%',
                fontSize: '28px',
                letterSpacing: '12px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#1e293b',
                padding: '0.65rem 0.5rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Chưa nhận được mã?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0}
              style={{
                background: 'none',
                border: 'none',
                color: resendCountdown > 0 ? '#94a3b8' : '#2563eb',
                fontWeight: 600,
                cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RotateCcw size={13} />
              {resendCountdown > 0 ? `Gửi lại sau (${resendCountdown}s)` : 'Gửi lại mã OTP (API 11)'}
            </button>
          </div>
        </div>
      </ConfirmModal>

      {/* MODAL QUÊN MẬT KHẨU (API 8) */}
      <ConfirmModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        type="info"
        title="Khôi phục mật khẩu (API 8)"
        confirmText={forgotSuccessData?.resetToken ? "Đặt lại mật khẩu ngay" : "Gửi mã khôi phục"}
        cancelText="Đóng"
        showCancel={true}
        onConfirm={() => {
          if (forgotSuccessData?.resetToken) {
            setShowResetModal(true);
            setShowForgotModal(false);
          } else {
            handleForgotSubmit({ preventDefault: () => {} });
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>
            Nhập email tài khoản của bạn để nhận mã khôi phục mật khẩu từ <code>son666727@gmail.com</code>:
          </p>
          <input
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="vana@example.com"
            className="form-input"
            style={{ width: '100%' }}
          />

          {forgotSuccessData && (
            <div style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem'
            }}>
              <strong>✓ Đã gửi yêu cầu thành công!</strong>
              <div style={{ marginTop: '0.25rem' }}>{forgotSuccessData.message}</div>
              {forgotSuccessData.resetToken && (
                <div style={{ marginTop: '0.5rem', wordBreak: 'break-all', backgroundColor: '#e2e8f0', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                  <strong>Token kiểm thử:</strong> <code>{forgotSuccessData.resetToken}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </ConfirmModal>

      {/* MODAL ĐẶT LẠI MẬT KHẨU (API 9) */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        type="confirm"
        title="Đặt lại mật khẩu mới (API 9)"
        confirmText={resetLoading ? "Đang xử lý..." : "Xác nhận đổi"}
        cancelText="Hủy"
        onConfirm={handleResetSubmit}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Mã xác thực OTP (6 chữ số từ son666727@gmail.com):</label>
            <input
              type="text"
              maxLength={6}
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••••"
              className="form-input"
              style={{
                width: '100%',
                marginTop: '0.25rem',
                fontSize: '22px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 700
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Mật khẩu mới (tối thiểu 6 ký tự):</label>
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="Mật khẩu mới"
              className="form-input"
              style={{ width: '100%', marginTop: '0.25rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Xác nhận mật khẩu mới:</label>
            <input
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="form-input"
              style={{ width: '100%', marginTop: '0.25rem' }}
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};
