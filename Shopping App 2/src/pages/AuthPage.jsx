import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff, Package, ArrowLeft, Mail, Lock, User, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { validateName, validateEmail } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import loginDeskImg from '../assets/login-desk.png';
import './AuthPage.css';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const isRegisterParam = searchParams.get('mode') === 'register';
  const [isRegister, setIsRegister] = useState(isRegisterParam);

  const [email, setEmail] = useState('minhanh@example.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Minh Anh');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Validation state
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [errors, setErrors] = useState({});

  const { login, register, isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setIsRegister(searchParams.get('mode') === 'register');
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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
    setErrors(errs);
  }, [name, email, password, isRegister, touched]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });

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

    if (isRegister) {
      register({
        name: name.trim() || 'Minh Anh',
        email: email.trim() || 'minhanh@example.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
      });
    } else {
      login({
        name: name.trim() || (email ? email.split('@')[0] : 'Minh Anh'),
        email: email.trim() || 'minhanh@example.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
      });
    }
    navigate('/products');
  };

  const dynamicCartNotice = cartCount > 0 
    ? `${cartCount} sản phẩm trong giỏ hàng vẫn được giữ lại.` 
    : '3 sản phẩm trong giỏ hàng vẫn được giữ lại.';

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
              Theo dõi đơn hàng, lưu thông tin giao hàng và chia sẻ trải nghiệm với thiết bị đã mua.
            </p>
          </div>
        </aside>

        {/* ==================== CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ ==================== */}
        <section className="auth-right-col">
          <span className="auth-top-badge">TÀI KHOẢN NỐI</span>
          
          <h1 className="auth-main-title">
            {isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </h1>
          
          <p className="auth-main-subtitle">
            {isRegister 
              ? 'Tạo tài khoản để đồng bộ thiết bị và lưu lịch sử mua sắm.'
              : `Đăng nhập để tiếp tục thanh toán. ${dynamicCartNotice}`
            }
          </p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {isRegister && (
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
                    placeholder="Nguyễn Minh Anh"
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
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                Email <span className="form-label-required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon-left" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="minhanh@example.com"
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
                <a href="#forgot" className="auth-forgot-link" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}>
                  Quên mật khẩu?
                </a>
              )}
            </div>

            <button type="submit" className="auth-submit-btn">
              <span>{isRegister ? 'Tạo tài khoản & bắt đầu' : 'Đăng nhập & tiếp tục thanh toán'}</span>
              <ArrowUpRight className="auth-submit-arrow" />
            </button>
          </form>

          <p className="auth-switch-text">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => setIsRegister(!isRegister)}
              style={{ background: 'none', border: 'none', font: 'inherit' }}
            >
              {isRegister ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
            </button>
          </p>

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

      {/* MODEL BOX: QUÊN MẬT KHẨU */}
      <ConfirmModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        type="info"
        title="Khôi phục mật khẩu"
        message={`Mã xác thực OTP đã được gửi đến email "${email || 'của bạn'}". Vui lòng kiểm tra hộp thư đến hoặc mục thư rác để đặt lại mật khẩu mới.`}
        confirmText="Đã hiểu"
        showCancel={false}
        onConfirm={() => setShowForgotModal(false)}
      />
    </div>
  );
};
