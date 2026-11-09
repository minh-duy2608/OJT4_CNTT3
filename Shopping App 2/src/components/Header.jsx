import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  X,
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
  ShieldCheck,
  Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { productApi } from '../services/productApi';
import { shopApi } from '../services/shopApi';
import { formatVND } from '../data/products';
import { RegisterShopModal } from './RegisterShopModal';
import { WishlistModal } from './WishlistModal';
import { ThemeToggle } from './ThemeToggle';
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
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { cartCount, cartBumping } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Shop state & Registration modal
  const [isRegisterShopModalOpen, setIsRegisterShopModalOpen] = useState(false);
  const [myShop, setMyShop] = useState(null);

  // State tìm kiếm gợi ý tức thì (Live Search Typeahead - STT 43: GET /products/search)
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Debounce gọi API searchProducts khi người dùng gõ từ 2 ký tự
  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await productApi.searchProducts({ keyword: query, limit: 5 });
        const list = Array.isArray(res) ? res : (res?.content || []);
        setSearchSuggestions(list);
        setShowSuggestions(true);
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
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

  // Kiểm tra vai trò Kênh Người Bán (SHOP_MANAGER / SHOP_OWNER)
  const isShopManager = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    if (r === 'SHOP_MANAGER' || r === 'ROLE_SHOP_MANAGER' || r === 'SHOP_OWNER') return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(item => {
        const code = (typeof item === 'string' ? item : item?.code || '').toUpperCase();
        return code === 'SHOP_MANAGER' || code === 'ROLE_SHOP_MANAGER' || code === 'SHOP_OWNER';
      });
    }
    return false;
  }, [user]);

  // Lấy thông tin Shop của user hiện tại nếu đã có
  useEffect(() => {
    if (isAuthenticated) {
      shopApi.getMyShop()
        .then((res) => {
          if (res?.data) {
            setMyShop(res.data);
          }
        })
        .catch(() => { });
    } else {
      setMyShop(null);
    }
  }, [isAuthenticated, user?.role]);

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

          {/* Ô tìm kiếm & Gợi ý tức thì (Live Search Dropdown) */}
          <div className="cyber-search-container" ref={searchContainerRef}>
            <form className="cyber-search-form" role="search" onSubmit={handleSearchSubmit}>
              <Search size={18} className="cyber-search-icon" />
              <input
                type="text"
                className="cyber-search-input"
                placeholder="Tìm kiếm thiết bị, điện thoại, laptop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchSuggestions.length > 0) setShowSuggestions(true);
                }}
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

            {/* Menu nổi Live Search Suggestions */}
            {showSuggestions && (
              <div className="cyber-live-search-dropdown" role="listbox">
                <div className="live-search-header">
                  <span>GỢI Ý TÌM KIẾM</span>
                  {isSearching && <span className="live-search-loading">Đang tìm...</span>}
                </div>

                {searchSuggestions.length === 0 ? (
                  <div className="live-search-empty">
                    Không tìm thấy sản phẩm nào phù hợp với "{searchTerm}"
                  </div>
                ) : (
                  <div className="live-search-list">
                    {searchSuggestions.map((item) => (
                      <Link
                        key={item.id}
                        to={`/products/${item.id}`}
                        className="live-search-item"
                        onClick={() => {
                          setShowSuggestions(false);
                          setSearchTerm('');
                        }}
                      >
                        <div className="live-search-thumb">
                          <img
                            src={item.image || item.primaryImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80'}
                            alt={item.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>
                        <div className="live-search-info">
                          <div className="live-search-name">{item.name}</div>
                          <div className="live-search-price">
                            {formatVND(item.salePrice || item.price || 0)}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div
                      className="live-search-footer"
                      onClick={(e) => {
                        setShowSuggestions(false);
                        handleSearchSubmit(e);
                      }}
                    >
                      Xem tất cả kết quả cho "<strong>{searchTerm}</strong>" →
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
              {/* Nếu là Admin: Hiện Quản trị */}
              {isAuthenticated && isUserAdmin && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `cyber-nav-link ${isActive ? 'active' : ''}`}
                    style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ShieldCheck size={16} />
                    Quản trị Hệ Thống
                  </NavLink>
                </li>
              )}

              {/* Nếu là Shop Manager (không phải admin): Hiện Kênh Người Bán */}
              {isAuthenticated && isShopManager && !isUserAdmin && (
                <li>
                  <NavLink
                    to="/admin?tab=shops"
                    className="cyber-nav-link"
                    style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Store size={16} />
                    Kênh Người Bán
                  </NavLink>
                </li>
              )}

              {/* Nếu là Khách hàng (chưa mở shop) hoặc Khách vãng lai: Hiện nút Đăng ký mở Shop */}
              {(!isAuthenticated || (!isUserAdmin && !isShopManager)) && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login?redirect=/');
                      } else {
                        setIsRegisterShopModalOpen(true);
                      }
                    }}
                    className="cyber-nav-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#059669',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: 'inherit',
                      padding: 0
                    }}
                  >
                    <Store size={16} />
                    Đăng ký mở Shop
                  </button>
                </li>
              )}
            </ul>
          </nav>

          {/* Nhóm Icons tác vụ: Theme Toggle, Giỏ hàng, Tài khoản */}
          <div className="cyber-actions">
            {/* Nút chuyển đổi Dark / Light mode */}
            <ThemeToggle />

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
                      {isShopManager && !isUserAdmin && (
                        <Link
                          to="/admin?tab=shops"
                          className="cyber-dropdown-item"
                          onClick={() => setShowAuthDropdown(false)}
                          style={{ color: '#059669', fontWeight: 600, background: '#f0fdf4' }}
                        >
                          <Store size={16} color="#059669" />
                          Kênh Người Bán của tôi
                        </Link>
                      )}
                      {!isUserAdmin && !isShopManager && (
                        <button
                          type="button"
                          className="cyber-dropdown-item"
                          onClick={() => {
                            setShowAuthDropdown(false);
                            setIsRegisterShopModalOpen(true);
                          }}
                          style={{ color: '#059669', fontWeight: 600, background: '#f0fdf4', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                        >
                          <Store size={16} color="#059669" />
                          Đăng ký mở Shop ngay
                        </button>
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

      {/* Modal danh sách yêu thích cho Khách hàng (STT 79-82) */}
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

      {/* Modal đăng ký mở Shop cho Khách hàng */}
      <RegisterShopModal
        isOpen={isRegisterShopModalOpen}
        onClose={() => setIsRegisterShopModalOpen(false)}
        onSuccess={(createdShop) => {
          setIsRegisterShopModalOpen(false);
          setMyShop(createdShop);
          if (refreshUser) refreshUser();
          navigate('/admin?tab=shops');
        }}
      />
    </header>
  );
};
