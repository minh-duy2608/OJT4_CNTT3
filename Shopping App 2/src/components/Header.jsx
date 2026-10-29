import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  X,
  Heart, 
  ShoppingCart, 
  User, 
  Smartphone, 
  Laptop, 
  Watch, 
  Camera, 
  Headphones, 
  Gamepad2,
  LogOut,
  ChevronDown,
  Package,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Header.css';

// Logo SVG icon hình tam giác công nghệ của Cyber
const CyberIcon = ({ className = "cyber-logo-icon" }) => (
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

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, cartBumping } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Đồng bộ từ khóa tìm kiếm khi URL thay đổi (VD khi người dùng bấm "Xóa tìm kiếm" ở trang sản phẩm)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search');
    if (query !== null) {
      setSearchTerm(query);
    } else {
      setSearchTerm('');
    }
  }, [location.search]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAuthDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kiểm tra vai trò Quản trị viên (ADMIN)
  const isUserAdmin = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(item => {
        const code = (typeof item === 'string' ? item : item?.code || '').toUpperCase();
        return code === 'ADMIN' || code === 'ROLE_ADMIN';
      });
    }
    return false;
  }, [user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleClearHeaderSearch = () => {
    setSearchTerm('');
    const params = new URLSearchParams(location.search);
    if (params.has('search')) {
      params.delete('search');
      navigate({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : ''
      });
    }
  };

  return (
    <header className="cyber-header-wrapper" role="banner">
      {/* 1. THANH HEADER CHÍNH (Nền trắng) */}
      <div className="cyber-main-header">
        <div className="container cyber-header-container">
          {/* Logo Cyber */}
          <Link to="/" className="cyber-logo" aria-label="Cyber Trang chủ">
            <CyberIcon />
            <span>cyber</span>
          </Link>

          {/* Ô tìm kiếm */}
          <form className="cyber-search-form" role="search" onSubmit={handleSearchSubmit}>
            <Search size={18} className="cyber-search-icon" />
            <input
              type="text"
              className="cyber-search-input"
              placeholder="Tìm kiếm thiết bị, điện thoại, laptop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearHeaderSearch}
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  borderRadius: '50%'
                }}
              >
                <X size={15} />
              </button>
            )}
          </form>

          {/* Menu liên kết chính: Trang chủ, Giới thiệu, Liên hệ */}
          <nav aria-label="Menu chính">
            <ul className="cyber-nav-links">
              <li>
                <NavLink 
                  to="/" 
                  className={({ isActive }) => `cyber-nav-link ${isActive ? 'active' : ''}`}
                  end
                >
                  Trang chủ
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/about" 
                  className={({ isActive }) => `cyber-nav-link ${isActive ? 'active' : ''}`}
                >
                  Giới thiệu
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/contact" 
                  className={({ isActive }) => `cyber-nav-link ${isActive ? 'active' : ''}`}
                >
                  Liên hệ
                </NavLink>
              </li>
              {isAuthenticated && isUserAdmin && (
                <li>
                  <NavLink 
                    to="/admin" 
                    className={({ isActive }) => `cyber-nav-link ${isActive ? 'active' : ''}`}
                    style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ShieldCheck size={16} />
                    Quản trị
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          {/* Nhóm Icons tác vụ: Yêu thích, Giỏ hàng, Tài khoản */}
          <div className="cyber-actions">
            {/* Wishlist */}
            <Link to="/products" className="cyber-action-btn" aria-label="Danh sách yêu thích">
              <Heart size={21} strokeWidth={1.8} />
            </Link>

            {/* Giỏ hàng với hiệu ứng nhảy khi sản phẩm bay vào */}
            <Link 
              to="/cart" 
              id="cyber-header-cart-btn"
              className={`cyber-action-btn ${cartBumping ? 'cyber-cart-btn-bumping' : ''}`} 
              aria-label={`Giỏ hàng có ${cartCount} sản phẩm`}
            >
              <ShoppingCart size={21} strokeWidth={1.8} />
              {cartCount > 0 && <span className="cyber-cart-badge">{cartCount}</span>}
            </Link>

            {/* Tài khoản Người dùng */}
            <div className="cyber-user-wrapper" ref={dropdownRef}>
              {isAuthenticated && user ? (
                /* Đã đăng nhập: Hiện Avatar + Tên */
                <button
                  type="button"
                  className="cyber-user-btn"
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  aria-haspopup="true"
                  aria-expanded={showAuthDropdown}
                  aria-label="Menu tài khoản"
                >
                  <img src={user.avatar} alt={user.name} className="cyber-user-avatar" />
                  <span className="cyber-user-name">{user.name}</span>
                  <ChevronDown size={14} color="#71717a" />
                </button>
              ) : (
                /* Chưa đăng nhập: Hiện Icon User */
                <button
                  type="button"
                  className="cyber-action-btn"
                  onClick={() => setShowAuthDropdown(!showAuthDropdown)}
                  aria-label="Tài khoản (Đăng nhập / Đăng ký)"
                  aria-haspopup="true"
                  aria-expanded={showAuthDropdown}
                >
                  <User size={21} strokeWidth={1.8} />
                </button>
              )}

              {/* Dropdown Menu tài khoản */}
              {showAuthDropdown && (
                <div className="cyber-user-dropdown">
                  {isAuthenticated && user ? (
                    <>
                      {isUserAdmin && (
                        <Link 
                          to="/admin" 
                          className="cyber-dropdown-item" 
                          onClick={() => setShowAuthDropdown(false)}
                          style={{ color: '#2563eb', fontWeight: 600, background: '#eff6ff' }}
                        >
                          <ShieldCheck size={16} color="#2563eb" />
                          Trung tâm Quản trị
                        </Link>
                      )}
                      <Link 
                        to="/profile" 
                        className="cyber-dropdown-item" 
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        <User size={15} />
                        Thông tin tài khoản
                      </Link>
                      <Link 
                        to="/orders" 
                        className="cyber-dropdown-item" 
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        <Package size={15} />
                        Đơn hàng của tôi
                      </Link>
                      <Link 
                        to="/cart" 
                        className="cyber-dropdown-item" 
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        <ShoppingCart size={15} />
                        Giỏ hàng của tôi ({cartCount})
                      </Link>
                      <button 
                        type="button" 
                        className="cyber-dropdown-item danger" 
                        onClick={() => {
                          setShowAuthDropdown(false);
                          logout();
                        }}
                      >
                        <LogOut size={15} />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/auth?mode=login" 
                        className="cyber-dropdown-item" 
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        Đăng nhập
                      </Link>
                      <Link 
                        to="/auth?mode=register" 
                        className="cyber-dropdown-item" 
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        Đăng ký tài khoản
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THANH DANH MỤC PHỤ (Nền xám đậm #2e2e2e có vạch ngăn) */}
      <nav className="cyber-subnav" aria-label="Danh mục công nghệ">
        <div className="container">
          <ul className="cyber-subnav-list">
            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=phones" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Smartphone className="cyber-subnav-icon" />
                <span>Điện thoại</span>
              </NavLink>
            </li>

            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=laptops" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Laptop className="cyber-subnav-icon" />
                <span>Laptop</span>
              </NavLink>
            </li>

            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=smartwatches" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Watch className="cyber-subnav-icon" />
                <span>Đồng hồ thông minh</span>
              </NavLink>
            </li>

            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=cameras" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Camera className="cyber-subnav-icon" />
                <span>Cameras</span>
              </NavLink>
            </li>

            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=headphones" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Headphones className="cyber-subnav-icon" />
                <span>Tai nghe</span>
              </NavLink>
            </li>

            <li className="cyber-subnav-item-wrap">
              <NavLink 
                to="/products?category=gaming" 
                className={({ isActive }) => `cyber-subnav-link ${isActive ? 'active' : ''}`}
              >
                <Gamepad2 className="cyber-subnav-icon" />
                <span>Gaming</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};
