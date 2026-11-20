import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  X,
  Menu,
  ShoppingCart,
  User,
  LogOut,
  ChevronDown,
  Package,
  ShieldCheck,
  Store,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { productApi } from '../services/productApi';
import { formatVND } from '../data/products';
import { WishlistModal } from './WishlistModal';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';
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
  const { totalUnread } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Tự động đóng menu trên mobile khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowAuthDropdown(false);
  }, [location.pathname]);

  // Shop state & Registration modal

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

            </ul>
          </nav>

          {/* Nhóm Icons tác vụ: Theme Toggle, Giỏ hàng, Tài khoản */}
          <div className="cyber-actions">
            {/* Nút chuyển đổi Dark / Light mode */}
            <ThemeToggle />

            {/* Thông báo nếu đã đăng nhập */}
            {isAuthenticated && <NotificationDropdown />}

            {/* Tin nhắn trực tiếp thời gian thực (Chỉ dành cho Shop và Khách hàng, Admin không chat) */}
            {isAuthenticated && !isUserAdmin && (
              <Link
                to={isShopManager ? "/admin?tab=messages" : "/chat"}
                className="cyber-action-btn"
                title="Hộp thư tin nhắn"
                aria-label={`Hộp thư tin nhắn ${totalUnread > 0 ? `(${totalUnread} tin mới)` : ''}`}
                style={{ position: 'relative' }}
              >
                <MessageCircle size={21} strokeWidth={1.8} />
                {totalUnread > 0 && (
                  <span className="cyber-cart-badge" style={{ backgroundColor: '#ef4444' }}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>
            )}

            {/* Giỏ hàng với hiệu ứng nhảy khi sản phẩm bay vào (chỉ hiện số lượng khi đã đăng nhập) */}
            <Link
              to="/cart"
              id="cyber-header-cart-btn"
              className={`cyber-action-btn ${cartBumping ? 'cyber-cart-btn-bumping' : ''}`}
              aria-label={isAuthenticated ? `Giỏ hàng có ${cartCount} sản phẩm` : 'Giỏ hàng'}
            >
              <ShoppingCart size={21} strokeWidth={1.8} />
              {isAuthenticated && cartCount > 0 && (
                <span className="cyber-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
              )}
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
                      <Link
                        to="/profile"
                        className="cyber-dropdown-item"
                        onClick={() => setShowAuthDropdown(false)}
                      >
                        <User size={15} />
                        Thông tin tài khoản
                      </Link>
                      {!isUserAdmin && (
                        <Link
                          to={isShopManager ? "/admin?tab=messages" : "/chat"}
                          className="cyber-dropdown-item"
                          onClick={() => setShowAuthDropdown(false)}
                        >
                          <MessageCircle size={15} />
                          Hộp thư tin nhắn {totalUnread > 0 && `(${totalUnread})`}
                        </Link>
                      )}
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

            {/* Nút Hamburger bật/tắt Mobile Navigation trên Điện thoại / Tablet */}
            <button
              type="button"
              className="cyber-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Drawer trượt mượt mà dành riêng cho Mobile & Tablet */}
      {mobileMenuOpen && (
        <div className="cyber-mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="cyber-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cyber-mobile-drawer-header">
              <Link to="/" className="cyber-logo" onClick={() => setMobileMenuOpen(false)}>
                <CyberIcon />
                <span>cyber</span>
              </Link>
              <button
                type="button"
                className="cyber-mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="cyber-mobile-drawer-body">
              <div className="cyber-mobile-nav-group">
                <span className="cyber-mobile-group-title">ĐIỀU HƯỚNG CHÍNH</span>
                <NavLink
                  to="/"
                  className={({ isActive }) => `cyber-mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  end
                >
                  Trang chủ
                </NavLink>
                <NavLink
                  to="/products"
                  className={({ isActive }) => `cyber-mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tất cả sản phẩm
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) => `cyber-mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Giới thiệu
                </NavLink>
                <NavLink
                  to="/contact"
                  className={({ isActive }) => `cyber-mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Liên hệ
                </NavLink>
              </div>

              {/* Kênh quản trị & Bán hàng */}
              <div className="cyber-mobile-nav-group">
                <span className="cyber-mobile-group-title">KÊNH BÁN & QUẢN TRỊ</span>
                {isAuthenticated && isUserAdmin && (
                  <NavLink
                    to="/admin"
                    className="cyber-mobile-nav-link highlight-admin"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShieldCheck size={18} />
                    Quản trị Hệ Thống
                  </NavLink>
                )}
                {isAuthenticated && isShopManager && !isUserAdmin && (
                  <NavLink
                    to="/admin?tab=shops"
                    className="cyber-mobile-nav-link highlight-seller"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Store size={18} />
                    Kênh Người Bán của tôi
                  </NavLink>
                )}
              </div>

              {/* Thông tin tài khoản */}
              <div className="cyber-mobile-nav-group">
                <span className="cyber-mobile-group-title">TÀI KHOẢN CỦA BẠN</span>
                {isAuthenticated && user ? (
                  <>
                    <NavLink
                      to="/profile"
                      className="cyber-mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User size={18} />
                      Tài khoản ({user.name})
                    </NavLink>
                    <NavLink
                      to="/orders"
                      className="cyber-mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Package size={18} />
                      Đơn hàng của tôi
                    </NavLink>
                    <NavLink
                      to="/cart"
                      className="cyber-mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ShoppingCart size={18} />
                      Giỏ hàng ({cartCount})
                    </NavLink>
                    {!isUserAdmin && (
                      <NavLink
                        to={isShopManager ? "/admin?tab=messages" : "/chat"}
                        className="cyber-mobile-nav-link"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <MessageCircle size={18} />
                        Tin nhắn {totalUnread > 0 && `(${totalUnread} mới)`}
                      </NavLink>
                    )}
                    <button
                      type="button"
                      className="cyber-mobile-nav-link danger"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut size={18} />
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/auth?mode=login"
                      className="cyber-mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User size={18} />
                      Đăng nhập
                    </NavLink>
                    <NavLink
                      to="/auth?mode=register"
                      className="cyber-mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Package size={18} />
                      Đăng ký tài khoản
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal danh sách yêu thích cho Khách hàng (STT 79-82) */}
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

    </header>
  );
};
