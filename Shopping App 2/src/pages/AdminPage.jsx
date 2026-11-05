import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Shield,
  ShieldCheck,
  FolderTree,
  Lock,
  Unlock,
  Key,
  Edit,
  Trash2,
  Search,
  X,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  UserCheck,
  Check,
  Layers,
  Package,
  Activity,
  Sliders,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Award,
  Upload,
  Image,
  PlusCircle,
  ShoppingBag,
  Box,
  SlidersHorizontal,
  Store,
  Archive,
  TrendingDown,
  TrendingUp,
  DollarSign,
  CreditCard,
  Wallet,
  BarChart3,
  Ticket,
  Tag,
  Percent,
  Copy
} from 'lucide-react';
import { revenueApi } from '../services/revenueApi';
import { couponApi } from '../services/couponApi';
import { useAuth } from '../context/AuthContext';
import { adminUserApi } from '../services/adminUserApi';
import { adminRoleApi } from '../services/adminRoleApi';
import { categoryApi } from '../services/categoryApi';
import { brandApi } from '../services/brandApi';
import { productApi } from '../services/productApi';
import { orderApi } from '../services/orderApi';
import { shopApi } from '../services/shopApi';
import { inventoryApi } from '../services/inventoryApi';
import { formatVND } from '../data/products';
import { ConfirmModal } from '../components/ConfirmModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { parseProductSpecs, formatProductDescription, SPEC_PRESETS } from '../utils/productSpecs';
import './AdminPage.css';

// Core system roles protected by the system
const PROTECTED_SYSTEM_ROLES = ['ADMIN', 'CLIENT', 'SHOP_MANAGER'];

// Helper: Convert Vietnamese string to clean URL-friendly SEO slug
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export const AdminPage = () => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const queryTab = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get('tab');
  }, [location.search]);

  // Active top-level tab
  const [activeTab, setActiveTab] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('tab') || 'revenue';
  });

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Global Alert Message
  const [alert, setAlert] = useState(null); // { type: 'success'|'error'|'info', message: string }

  const triggerAlert = (message, type = 'success') => {
    setAlert({ message, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  // =========================================================================
  // 1. TAB: QUẢN LÝ NGƯỜI DÙNG (USERS - STT 12-17)
  // =========================================================================
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(0);
  const [userPageSize] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalElements, setUserTotalElements] = useState(0);
  const [userKeyword, setUserKeyword] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Modals for User Management
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserData, setEditUserData] = useState({ fullName: '', phone: '', avatarUrl: '' });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [roleAssignUser, setRoleAssignUser] = useState(null);
  const [isRoleAssignModalOpen, setIsRoleAssignModalOpen] = useState(false);
  const [selectedRoleCodes, setSelectedRoleCodes] = useState([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const [statusTargetUser, setStatusTargetUser] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetNewStatus, setTargetNewStatus] = useState('BLOCKED');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Fetch users with filters
  const fetchUsers = useCallback(async (page = 0) => {
    setUsersLoading(true);
    try {
      const res = await adminUserApi.getUsers({
        page,
        size: userPageSize,
        keyword: userKeyword.trim() || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        sortBy: 'id',
        sortDir: 'desc'
      });
      if (res) {
        setUsers(res.content || []);
        setUserPage(res.pageNumber || 0);
        setUserTotalPages(res.totalPages || 1);
        setUserTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      triggerAlert(err.message || 'Không thể tải danh sách người dùng.', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [userPageSize, userKeyword, userRoleFilter, userStatusFilter]);

  // Load user details (API 13)
  const handleOpenUserDetail = async (userId) => {
    try {
      const data = await adminUserApi.getUserById(userId);
      setSelectedUserDetail(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      triggerAlert(err.message || 'Không thể lấy thông tin chi tiết người dùng.', 'error');
    }
  };

  // Open edit modal (API 14)
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setEditUserData({
      fullName: u.fullName || '',
      phone: u.phone || '',
      avatarUrl: u.avatarUrl || ''
    });
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    try {
      await adminUserApi.updateUser(editingUser.id, {
        fullName: editUserData.fullName?.trim() || null,
        phone: editUserData.phone?.trim() || null,
        avatarUrl: editUserData.avatarUrl?.trim() || null
      });
      triggerAlert(`Đã cập nhật thông tin người dùng #${editingUser.id} thành công!`, 'success');
      setIsEditUserModalOpen(false);
      fetchUsers(userPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi cập nhật người dùng.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open role assign modal (API 16 & 17)
  const handleOpenRoleAssign = async (u) => {
    setRoleAssignUser(u);
    const userOwnsShop = Boolean(
      u.ownsShop ||
      adminShops.some((s) => s.ownerId === u.id && s.status !== 'REJECTED')
    );
    try {
      const userRoles = await adminUserApi.getUserRoles(u.id);
      let codes = userRoles.map((r) => r.code);
      if (userOwnsShop && !codes.includes('SHOP_MANAGER')) {
        codes.push('SHOP_MANAGER');
      }
      setSelectedRoleCodes(codes);
      setIsRoleAssignModalOpen(true);
    } catch (err) {
      // Fallback: extract from user object
      const currentRoles = (u.roles || []).map((r) => (typeof r === 'string' ? r : r.code));
      let codes = currentRoles.length > 0 ? currentRoles : [u.role];
      if (userOwnsShop && !codes.includes('SHOP_MANAGER')) {
        codes.push('SHOP_MANAGER');
      }
      setSelectedRoleCodes(codes);
      setIsRoleAssignModalOpen(true);
    }
  };

  const handleSaveUserRoles = async () => {
    if (!roleAssignUser) return;
    if (selectedRoleCodes.length === 0) {
      triggerAlert('Người dùng phải có ít nhất một vai trò hệ thống.', 'error');
      return;
    }

    const userOwnsShop = Boolean(
      roleAssignUser.ownsShop ||
      adminShops.some((s) => s.ownerId === roleAssignUser.id && s.status !== 'REJECTED')
    );

    let finalRoleCodes = [...selectedRoleCodes];
    if (userOwnsShop && !finalRoleCodes.includes('SHOP_MANAGER')) {
      finalRoleCodes.push('SHOP_MANAGER');
    }

    setIsSavingRoles(true);
    try {
      await adminUserApi.assignUserRoles(roleAssignUser.id, { roles: finalRoleCodes });
      triggerAlert(`Đã cập nhật tập vai trò cho người dùng ${roleAssignUser.username} thành công!`, 'success');
      if (roleAssignUser.id === user?.id && typeof refreshUser === 'function') {
        await refreshUser();
      }
      setIsRoleAssignModalOpen(false);
      fetchUsers(userPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi gán vai trò người dùng.', 'error');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Open status modal (API 15)
  const handleOpenStatusModal = (u, nextStatus) => {
    setStatusTargetUser(u);
    setTargetNewStatus(nextStatus);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetUser) return;
    setIsSavingStatus(true);
    try {
      await adminUserApi.updateUserStatus(statusTargetUser.id, { status: targetNewStatus });
      triggerAlert(`Đã chuyển trạng thái tài khoản ${statusTargetUser.username} sang ${targetNewStatus}!`, 'success');
      setIsStatusModalOpen(false);
      fetchUsers(userPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi thay đổi trạng thái tài khoản.', 'error');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // =========================================================================
  // 2. TAB: VAI TRÒ & PHÂN QUYỀN (ROLES & PERMISSIONS - STT 18-26)
  // =========================================================================
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState([]);

  // Modals for Roles
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ code: '', name: '', description: '', permissionCodes: [] });
  const [isSavingNewRole, setIsSavingNewRole] = useState(false);

  const [editingRole, setEditingRole] = useState(null);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editRoleData, setEditRoleData] = useState({ name: '', description: '' });
  const [isSavingEditRole, setIsSavingEditRole] = useState(false);

  const [assignRoleTarget, setAssignRoleTarget] = useState(null);
  const [isAssignPermModalOpen, setIsAssignPermModalOpen] = useState(false);
  const [roleSelectedPerms, setRoleSelectedPerms] = useState([]);
  const [permSearchKeyword, setPermSearchKeyword] = useState('');
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // Fetch roles and permissions
  const fetchRolesAndPermissions = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        adminRoleApi.getRoles(),
        adminRoleApi.getPermissions()
      ]);
      setRoles(rolesData || []);
      setAllPermissions(permsData || []);
    } catch (err) {
      console.error('Failed to load roles or permissions:', err);
      triggerAlert(err.message || 'Không thể tải danh sách vai trò hoặc quyền.', 'error');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Create role (API 20)
  const handleSaveNewRole = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!newRoleData.code.trim() || !newRoleData.name.trim()) {
      triggerAlert('Vui lòng nhập đầy đủ mã và tên vai trò.', 'error');
      return;
    }
    setIsSavingNewRole(true);
    try {
      await adminRoleApi.createRole({
        code: newRoleData.code.trim().toUpperCase(),
        name: newRoleData.name.trim(),
        description: newRoleData.description.trim(),
        permissionCodes: newRoleData.permissionCodes
      });
      triggerAlert(`Đã tạo vai trò mới "${newRoleData.name}" thành công!`, 'success');
      setIsCreateRoleModalOpen(false);
      setNewRoleData({ code: '', name: '', description: '', permissionCodes: [] });
      fetchRolesAndPermissions();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi tạo vai trò mới.', 'error');
    } finally {
      setIsSavingNewRole(false);
    }
  };

  // Open edit role (API 21)
  const handleOpenEditRole = (r) => {
    setEditingRole(r);
    setEditRoleData({ name: r.name, description: r.description || '' });
    setIsEditRoleModalOpen(true);
  };

  const handleSaveEditRole = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingRole) return;
    setIsSavingEditRole(true);
    try {
      await adminRoleApi.updateRole(editingRole.id, editRoleData);
      triggerAlert(`Đã cập nhật vai trò ${editingRole.code} thành công!`, 'success');
      setIsEditRoleModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi cập nhật vai trò.', 'error');
    } finally {
      setIsSavingEditRole(false);
    }
  };

  // Open Assign Permissions (API 24 & 25)
  const handleOpenAssignPermissions = async (r) => {
    setAssignRoleTarget(r);
    setPermSearchKeyword('');
    try {
      const perms = await adminRoleApi.getRolePermissions(r.id);
      setRoleSelectedPerms(perms.map((p) => p.code));
      setIsAssignPermModalOpen(true);
    } catch (err) {
      triggerAlert(err.message || 'Không thể lấy quyền hiện tại của vai trò.', 'error');
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!assignRoleTarget) return;
    setIsSavingPerms(true);
    try {
      await adminRoleApi.assignRolePermissions(assignRoleTarget.id, {
        permissionCodes: roleSelectedPerms
      });
      triggerAlert(`Đã phân ${roleSelectedPerms.length} quyền cho vai trò ${assignRoleTarget.name}!`, 'success');
      setIsAssignPermModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi gán quyền cho vai trò.', 'error');
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Delete role (API 22)
  const handleOpenDeleteRole = (r) => {
    if (PROTECTED_SYSTEM_ROLES.includes(r.code)) {
      triggerAlert(`Vai trò hệ thống [${r.code}] được bảo vệ nghiêm ngặt, không thể xóa!`, 'error');
      return;
    }
    setRoleToDelete(r);
    setIsDeleteRoleModalOpen(true);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await adminRoleApi.deleteRole(roleToDelete.id);
      triggerAlert(`Đã xóa vai trò tùy chỉnh [${roleToDelete.name}] thành công!`, 'success');
      setIsDeleteRoleModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi xóa vai trò.', 'error');
    } finally {
      setIsDeletingRole(false);
    }
  };

  // Filter permissions by search keyword
  const groupedPermissions = useMemo(() => {
    const filtered = allPermissions.filter((p) => {
      if (!permSearchKeyword) return true;
      const kw = permSearchKeyword.toLowerCase();
      return p.code.toLowerCase().includes(kw) || (p.name && p.name.toLowerCase().includes(kw)) || (p.description && p.description.toLowerCase().includes(kw));
    });

    // Group by prefix (USER_, ROLE_, CATEGORY_, PRODUCT_, ORDER_, SHOP_, REPORT_, SYSTEM_)
    const groups = {};
    filtered.forEach((p) => {
      const prefix = p.code.split('_')[0] || 'GENERAL';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(p);
    });
    return groups;
  }, [allPermissions, permSearchKeyword]);

  // =========================================================================
  // 3. TAB: QUẢN LÝ DANH MỤC SẢN PHẨM (CATEGORIES - STT 27-32)
  // =========================================================================
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('');

  // Modals for Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCatId, setCurrentCatId] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: '',
    sortOrder: 0,
    status: 'ACTIVE'
  });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleteCatModalOpen, setIsDeleteCatModalOpen] = useState(false);
  const [forceDeleteCat, setForceDeleteCat] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [viewingCatProducts, setViewingCatProducts] = useState(null);
  const [categoryProductsList, setCategoryProductsList] = useState([]);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await categoryApi.getCategories({
        status: categoryStatusFilter || undefined
      });
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      triggerAlert(err.message || 'Không thể tải danh mục sản phẩm.', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  }, [categoryStatusFilter]);

  // Open Create Category Modal (API 30)
  const handleOpenCreateCategory = () => {
    setIsEditingCategory(false);
    setCurrentCatId(null);
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: '',
      sortOrder: (categories.length + 1) * 10,
      status: 'ACTIVE'
    });
    setIsCategoryModalOpen(true);
  };

  // Open Edit Category Modal (API 31)
  const handleOpenEditCategory = (cat) => {
    setIsEditingCategory(true);
    setCurrentCatId(cat.id);
    setCategoryFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      parentId: cat.parentId || '',
      sortOrder: cat.sortOrder || 0,
      status: cat.status || 'ACTIVE'
    });
    setIsCategoryModalOpen(true);
  };

  // Handle Category name change with automatic Slug generation
  const handleCategoryNameChange = (e) => {
    const val = e.target.value;
    setCategoryFormData((prev) => ({
      ...prev,
      name: val,
      // Auto-update slug if creating or slug matches previous auto-slug
      slug: !isEditingCategory ? generateSlug(val) : prev.slug
    }));
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!categoryFormData.name.trim()) {
      triggerAlert('Vui lòng nhập tên danh mục.', 'error');
      return;
    }
    setIsSavingCategory(true);
    const payload = {
      name: categoryFormData.name.trim(),
      slug: (categoryFormData.slug.trim() || generateSlug(categoryFormData.name)).toLowerCase(),
      description: categoryFormData.description.trim() || null,
      imageUrl: categoryFormData.imageUrl.trim() || null,
      parentId: categoryFormData.parentId ? Number(categoryFormData.parentId) : null,
      sortOrder: Number(categoryFormData.sortOrder) || 0,
      status: categoryFormData.status
    };

    try {
      if (isEditingCategory && currentCatId) {
        await categoryApi.updateCategory(currentCatId, payload);
        triggerAlert(`Đã cập nhật danh mục "${payload.name}" thành công!`, 'success');
      } else {
        await categoryApi.createCategory(payload);
        triggerAlert(`Đã tạo danh mục mới "${payload.name}" thành công!`, 'success');
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi lưu danh mục sản phẩm.', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Open Delete Category Modal (API 32)
  const handleOpenDeleteCategory = (cat) => {
    setCategoryToDelete(cat);
    setForceDeleteCat(false);
    setIsDeleteCatModalOpen(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await categoryApi.deleteCategory(categoryToDelete.id, forceDeleteCat);
      triggerAlert(`Đã xử lý danh mục "${categoryToDelete.name}" thành công!`, 'success');
      setIsDeleteCatModalOpen(false);
      fetchCategories();
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi xóa/ngừng sử dụng danh mục.', 'error');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // View Category Products (API 29)
  const handleOpenCategoryProducts = async (cat) => {
    setViewingCatProducts(cat);
    setIsProductsModalOpen(true);
    setProductsLoading(true);
    try {
      const res = await categoryApi.getCategoryProducts(cat.id, { page: 0, size: 20 });
      setCategoryProductsList(res?.content || []);
    } catch (err) {
      console.error('Failed to load category products:', err);
      setCategoryProductsList([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // =========================================================================
  // 4. TAB: QUẢN LÝ THƯƠNG HIỆU (BRANDS - STT 33-38)
  // =========================================================================
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandStatusFilter, setBrandStatusFilter] = useState('');

  // Modals for Brands
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [currentBrandId, setCurrentBrandId] = useState(null);
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    description: '',
    status: 'ACTIVE'
  });
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  const [brandToDelete, setBrandToDelete] = useState(null);
  const [isDeleteBrandModalOpen, setIsDeleteBrandModalOpen] = useState(false);
  const [forceDeleteBrand, setForceDeleteBrand] = useState(false);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);

  const [viewingBrandProducts, setViewingBrandProducts] = useState(null);
  const [brandProductsList, setBrandProductsList] = useState([]);
  const [isBrandProductsModalOpen, setIsBrandProductsModalOpen] = useState(false);
  const [brandProductsLoading, setBrandProductsLoading] = useState(false);

  // Fetch Brands (API 33)
  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const data = await brandApi.getBrands({
        status: brandStatusFilter || undefined
      });
      setBrands(data || []);
    } catch (err) {
      console.error('Failed to load brands:', err);
      triggerAlert(err.message || 'Không thể tải danh sách thương hiệu.', 'error');
    } finally {
      setBrandsLoading(false);
    }
  }, [brandStatusFilter]);

  // Open Create Brand Modal (API 36)
  const handleOpenCreateBrand = () => {
    setIsEditingBrand(false);
    setCurrentBrandId(null);
    setBrandFormData({
      name: '',
      slug: '',
      logoUrl: '',
      description: '',
      status: 'ACTIVE'
    });
    setIsBrandModalOpen(true);
  };

  // Open Edit Brand Modal (API 37)
  const handleOpenEditBrand = (brand) => {
    setIsEditingBrand(true);
    setCurrentBrandId(brand.id);
    setBrandFormData({
      name: brand.name || '',
      slug: brand.slug || '',
      logoUrl: brand.logoUrl || '',
      description: brand.description || '',
      status: brand.status || 'ACTIVE'
    });
    setIsBrandModalOpen(true);
  };

  // Auto-generate slug when name changes in modal
  const handleBrandNameChange = (newName) => {
    const generated = generateSlug(newName);
    setBrandFormData((prev) => ({
      ...prev,
      name: newName,
      slug: isEditingBrand ? prev.slug : generated
    }));
  };

  // Submit Save Brand (API 36 / 37)
  const handleSaveBrand = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!brandFormData.name.trim()) {
      triggerAlert('Vui lòng nhập tên thương hiệu.', 'error');
      return;
    }

    setIsSavingBrand(true);
    try {
      const payload = {
        name: brandFormData.name.trim(),
        slug: brandFormData.slug.trim() || generateSlug(brandFormData.name),
        logoUrl: brandFormData.logoUrl.trim() || null,
        description: brandFormData.description.trim() || null,
        status: brandFormData.status
      };

      if (isEditingBrand) {
        await brandApi.updateBrand(currentBrandId, payload);
        triggerAlert(`Cập nhật thương hiệu "${payload.name}" thành công!`, 'success');
      } else {
        await brandApi.createBrand(payload);
        triggerAlert(`Tạo thương hiệu mới "${payload.name}" thành công!`, 'success');
      }

      setIsBrandModalOpen(false);
      fetchBrands();
    } catch (err) {
      console.error('Save brand error:', err);
      triggerAlert(err.message || 'Lỗi khi lưu thông tin thương hiệu.', 'error');
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Open Delete Brand Modal (API 38)
  const handleOpenDeleteBrand = (brand) => {
    setBrandToDelete(brand);
    setForceDeleteBrand(false);
    setIsDeleteBrandModalOpen(true);
  };

  // Confirm Delete Brand (API 38)
  const handleConfirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    setIsDeletingBrand(true);
    try {
      const res = await brandApi.deleteBrand(brandToDelete.id, forceDeleteBrand);
      triggerAlert(res?.message || `Xóa/ngừng dùng thương hiệu "${brandToDelete.name}" thành công!`, 'success');
      setIsDeleteBrandModalOpen(false);
      setBrandToDelete(null);
      fetchBrands();
    } catch (err) {
      console.error('Delete brand error:', err);
      triggerAlert(err.message || 'Lỗi khi xóa thương hiệu.', 'error');
    } finally {
      setIsDeletingBrand(false);
    }
  };

  // View Brand Products (API 35)
  const handleOpenBrandProducts = async (brand) => {
    setViewingBrandProducts(brand);
    setIsBrandProductsModalOpen(true);
    setBrandProductsLoading(true);
    try {
      const res = await brandApi.getBrandProducts(brand.id, { page: 0, size: 20 });
      setBrandProductsList(res?.content || []);
    } catch (err) {
      console.error('Failed to load brand products:', err);
      setBrandProductsList([]);
    } finally {
      setBrandProductsLoading(false);
    }
  };

  // =========================================================================
  // 5. TAB: QUẢN LÝ SẢN PHẨM & BIẾN THỂ (PRODUCTS - STT 39-44)
  // =========================================================================
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminProductsLoading, setAdminProductsLoading] = useState(false);
  const [prodPage, setProdPage] = useState(0);
  const [prodPageSize] = useState(10);
  const [prodTotalPages, setProdTotalPages] = useState(1);
  const [prodTotalElements, setProdTotalElements] = useState(0);
  const [prodKeyword, setProdKeyword] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('');
  const [prodBrandFilter, setProdBrandFilter] = useState('');

  // Modals for Product Management
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    slug: '',
    categoryId: '',
    brandId: '',
    shortDescription: '',
    description: '',
    warrantyMonths: 12,
    status: 'ACTIVE',
    variants: [],
    images: [],
    specifications: []
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [forceDeleteProduct, setForceDeleteProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [isProductDetailModalOpen, setIsProductDetailModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const handleAddCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setProductFormData((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          imageUrl: customImageUrl.trim(),
          isPrimary: prev.images.length === 0,
          sortOrder: prev.images.length
        }
      ]
    }));
    setCustomImageUrl('');
  };

  // Fetch products for Admin
  const fetchAdminProducts = useCallback(async (page = 0) => {
    setAdminProductsLoading(true);
    try {
      const res = await productApi.getProducts({
        page,
        size: prodPageSize,
        keyword: prodKeyword || undefined,
        categoryId: prodCategoryFilter || undefined,
        brandId: prodBrandFilter || undefined,
        sort: 'createdAt',
        sortDir: 'desc'
      });
      if (res) {
        setAdminProducts(res.content || []);
        setProdTotalElements(res.totalElements || 0);
        setProdTotalPages(res.totalPages || 1);
        setProdPage(res.page !== undefined ? res.page : page);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      triggerAlert(err.message || 'Không thể tải danh sách sản phẩm.', 'error');
    } finally {
      setAdminProductsLoading(false);
    }
  }, [prodPageSize, prodKeyword, prodCategoryFilter, prodBrandFilter]);

  // Open Create Product Modal
  const handleOpenCreateProduct = () => {
    setIsEditingProduct(false);
    setCurrentProductId(null);
    const defaultSpecs = [
      { name: 'Màn hình', value: '6.7 inch, Super Retina XDR OLED, 120Hz, Dynamic Island' },
      { name: 'Hệ điều hành', value: 'iOS 18 / Android 15' },
      { name: 'Chipset (CPU)', value: 'Apple A18 Pro 6 nhân mạnh mẽ' },
      { name: 'RAM & Lưu trữ', value: '8GB RAM | 256GB ROM' },
      { name: 'Camera sau', value: 'Chính 48MP + Siêu rộng 48MP + Tele 12MP (Zoom 5x)' },
      { name: 'Pin & Sạc', value: '4.685 mAh, Sạc nhanh 30W, Sạc không dây MagSafe' }
    ];
    setProductFormData({
      name: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
      shortDescription: '',
      description: '',
      warrantyMonths: 12,
      status: 'ACTIVE',
      variants: [
        {
          variantName: 'Phiên bản tiêu chuẩn',
          sku: '',
          color: 'Đen',
          storage: '128GB',
          price: 15000000,
          salePrice: '',
          stockQuantity: 100,
          status: 'ACTIVE'
        }
      ],
      images: [],
      specifications: defaultSpecs
    });
    setIsProductModalOpen(true);
  };

  const handleOpenAddProduct = handleOpenCreateProduct;

  // Open Edit Product Modal
  const handleOpenEditProduct = async (prod) => {
    setIsEditingProduct(true);
    setCurrentProductId(prod.id);
    try {
      const detail = await productApi.getProductById(prod.id);
      if (detail) {
        const parsed = parseProductSpecs(detail.description || '');
        setProductFormData({
          name: detail.name || '',
          slug: detail.slug || '',
          categoryId: detail.categoryId || detail.category?.id || '',
          brandId: detail.brandId || detail.brand?.id || '',
          shortDescription: detail.shortDescription || '',
          description: parsed.description || parsed.cleanDescription || detail.description || '',
          warrantyMonths: detail.warrantyMonths || 12,
          status: detail.status || 'ACTIVE',
          variants: (detail.variants && detail.variants.length > 0)
            ? detail.variants.map((v) => {
                let color = '';
                let storage = '';
                if (v.attributes) {
                  try {
                    const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                    color = attr.color || '';
                    storage = attr.storage || '';
                  } catch {}
                }
                return {
                  id: v.id,
                  variantName: v.variantName || '',
                  sku: v.sku || '',
                  color,
                  storage,
                  price: v.price || 0,
                  salePrice: v.salePrice || '',
                  stockQuantity: v.stockQuantity ?? 100,
                  status: v.status || 'ACTIVE'
                };
              })
            : [
                {
                  variantName: detail.name + ' - Tiêu chuẩn',
                  sku: '',
                  color: 'Đen',
                  storage: '128GB',
                  price: detail.minPrice || 10000000,
                  salePrice: '',
                  stockQuantity: 100,
                  status: 'ACTIVE'
                }
              ],
          images: (detail.images && detail.images.length > 0)
            ? detail.images.map((img, idx) => ({
                id: img.id,
                imageUrl: img.imageUrl,
                isPrimary: Boolean(img.isPrimary),
                sortOrder: img.sortOrder ?? idx
              }))
            : [],
          specifications: (parsed.specs && parsed.specs.length > 0)
            ? parsed.specs
            : [
                { name: 'Màn hình', value: '' },
                { name: 'Chip xử lý', value: '' },
                { name: 'RAM & Dung lượng', value: '' }
              ]
        });
        setIsProductModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching product for edit:', err);
      triggerAlert('Không thể tải chi tiết sản phẩm để chỉnh sửa.', 'error');
    }
  };

  // Auto-generate slug when product name changes
  const handleProductNameChange = (newName) => {
    const generated = generateSlug(newName);
    setProductFormData((prev) => ({
      ...prev,
      name: newName,
      slug: isEditingProduct ? prev.slug : generated
    }));
  };

  // Add new variant row
  const handleAddVariant = () => {
    setProductFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          variantName: `Phiên bản #${prev.variants.length + 1}`,
          sku: '',
          color: 'Bạc',
          storage: '256GB',
          price: 18000000,
          salePrice: '',
          stockQuantity: 50,
          status: 'ACTIVE'
        }
      ]
    }));
  };

  // Remove variant row
  const handleRemoveVariant = (index) => {
    if (productFormData.variants.length <= 1) {
      triggerAlert('Sản phẩm cần tối thiểu ít nhất 1 phiên bản!', 'error');
      return;
    }
    setProductFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  // Change variant field
  const handleVariantChange = (index, field, value) => {
    setProductFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  // Handle image upload from computer (multiple files)
  const handleProductImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const newImages = [];
      let hasSmallImage = false;

      for (const file of files) {
        // Kiểm tra kích thước tự nhiên của ảnh gốc
        let imgWidth = 0;
        let imgHeight = 0;
        try {
          const dims = await new Promise((resolve) => {
            const probe = new window.Image();
            probe.onload = () => resolve({ w: probe.naturalWidth, h: probe.naturalHeight });
            probe.onerror = () => resolve({ w: 0, h: 0 });
            probe.src = URL.createObjectURL(file);
          });
          imgWidth = dims.w;
          imgHeight = dims.h;
        } catch (_) {}

        if (imgWidth > 0 && imgHeight > 0 && (imgWidth < 300 || imgHeight < 300)) {
          hasSmallImage = true;
        }

        try {
          const res = await productApi.uploadImage(file);
          if (res?.url) {
            newImages.push({
              imageUrl: res.url,
              width: imgWidth,
              height: imgHeight,
              isPrimary: productFormData.images.length === 0 && newImages.length === 0,
              sortOrder: productFormData.images.length + newImages.length
            });
          }
        } catch (uploadErr) {
          console.warn('API upload fallback to local preview data URL:', uploadErr);
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          });
          newImages.push({
            imageUrl: dataUrl,
            width: imgWidth,
            height: imgHeight,
            isPrimary: productFormData.images.length === 0 && newImages.length === 0,
            sortOrder: productFormData.images.length + newImages.length
          });
        }
      }

      setProductFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));

      if (hasSmallImage) {
        triggerAlert(`Đã tải lên ${newImages.length} ảnh. Lưu ý: có ảnh kích thước nhỏ (<300px), khuyên dùng ảnh gốc từ 400x400px trở lên để đảm bảo độ sắc nét cao nhất!`, 'warning');
      } else {
        triggerAlert(`Đã thêm thành công ${newImages.length} hình ảnh sản phẩm sắc nét!`, 'success');
      }
    } catch (err) {
      console.error('Upload error:', err);
      triggerAlert('Có lỗi khi tải ảnh sản phẩm lên.', 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Set an image as primary
  const handleSetPrimaryImage = (index) => {
    setProductFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    }));
  };

  // Remove an image
  const handleRemoveImage = (index) => {
    setProductFormData((prev) => {
      const remaining = prev.images.filter((_, i) => i !== index);
      if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return { ...prev, images: remaining };
    });
  };

  // Dynamic Specifications Handlers
  const handleAddSpecification = () => {
    setProductFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { name: '', value: '' }]
    }));
  };

  const handleRemoveSpecification = (index) => {
    setProductFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const handleSpecificationChange = (index, field, val) => {
    setProductFormData((prev) => {
      const updated = [...prev.specifications];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, specifications: updated };
    });
  };

  const handleApplySpecPreset = (presetId) => {
    const preset = SPEC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newSpecs = (preset.fields || []).map((f) => ({ name: f, value: '' }));
    setProductFormData((prev) => ({
      ...prev,
      specifications: newSpecs
    }));
    triggerAlert(`Đã áp dụng mẫu thông số kỹ thuật: ${preset.label || preset.id}`, 'info');
  };

  // Save product (Create or Edit)
  const handleSaveProduct = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!productFormData.name.trim()) {
      triggerAlert('Vui lòng nhập tên sản phẩm.', 'error');
      return;
    }
    if (!productFormData.categoryId) {
      triggerAlert('Vui lòng chọn danh mục sản phẩm.', 'error');
      return;
    }
    if (productFormData.variants.length === 0) {
      triggerAlert('Vui lòng thiết lập ít nhất 1 phiên bản sản phẩm.', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const formattedDescription = formatProductDescription(
        productFormData.description.trim(),
        productFormData.specifications
      );

      const targetShopId = selectedShopId ? Number(selectedShopId) : (myShopInfo?.id || (isAdminUser ? 1 : null));
      if (!targetShopId) {
        triggerAlert('Vui lòng chọn cửa hàng hoặc chờ thông tin cửa hàng tải xong.', 'warning');
        setIsSavingProduct(false);
        return;
      }

      const payload = {
        name: productFormData.name.trim(),
        slug: productFormData.slug.trim() || generateSlug(productFormData.name),
        shopId: targetShopId,
        categoryId: Number(productFormData.categoryId),
        brandId: productFormData.brandId ? Number(productFormData.brandId) : null,
        shortDescription: productFormData.shortDescription.trim() || null,
        description: formattedDescription || null,
        warrantyMonths: Number(productFormData.warrantyMonths) || 12,
        status: productFormData.status,
        variants: productFormData.variants.map((v, idx) => ({
          id: v.id || null,
          variantName: (v.variantName && v.variantName.trim()) || `Phiên bản #${idx + 1}`,
          sku: (v.sku && v.sku.trim()) || `SKU-${currentProductId || Date.now()}-${idx + 1}`,
          color: v.color || null,
          storage: v.storage || null,
          price: Number(v.price) || 0,
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          stockQuantity: Number(v.stockQuantity) || 100,
          status: v.status || 'ACTIVE'
        })),
        images: productFormData.images.map((img, idx) => ({
          imageUrl: img.imageUrl,
          isPrimary: Boolean(img.isPrimary),
          sortOrder: idx
        }))
      };

      if (isEditingProduct) {
        if (targetShopId) {
          try {
            await productApi.updateShopProduct(targetShopId, currentProductId, payload);
          } catch {
            await productApi.updateProduct(currentProductId, payload);
          }
        } else {
          await productApi.updateProduct(currentProductId, payload);
        }
        triggerAlert(`Cập nhật sản phẩm "${payload.name}" thành công!`, 'success');
      } else {
        if (targetShopId) {
          try {
            await productApi.createShopProduct(targetShopId, payload);
          } catch {
            await productApi.createProduct(payload);
          }
        } else {
          await productApi.createProduct(payload);
        }
        triggerAlert(`Tạo sản phẩm mới "${payload.name}" thành công!`, 'success');
      }

      setIsProductModalOpen(false);
      fetchShopProducts(shopProdPage);
    } catch (err) {
      console.error('Save product error:', err);
      triggerAlert(err.message || 'Lỗi khi lưu thông tin sản phẩm.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Open Delete Product Modal
  const handleOpenDeleteProduct = (prod) => {
    setProductToDelete(prod);
    setForceDeleteProduct(false);
    setIsDeleteProductModalOpen(true);
  };

  // Confirm Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const res = await productApi.deleteProduct(productToDelete.id, forceDeleteProduct);
      triggerAlert(res?.message || `Xóa/ngừng bán sản phẩm "${productToDelete.name}" thành công!`, 'success');
      setIsDeleteProductModalOpen(false);
      setProductToDelete(null);
      fetchAdminProducts(prodPage);
    } catch (err) {
      console.error('Delete product error:', err);
      triggerAlert(err.message || 'Lỗi khi xóa sản phẩm.', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // View Product Details Modal
  const handleViewProductDetail = async (prod) => {
    try {
      const detail = await productApi.getProductById(prod.id);
      setSelectedProductDetail(detail || prod);
      setIsProductDetailModalOpen(true);
    } catch (err) {
      console.error('View detail error:', err);
      setSelectedProductDetail(prod);
      setIsProductDetailModalOpen(true);
    }
  };

  // =========================================================================
  // 6. TAB: QUYỀN HẠN CỦA TÔI (MY PERMISSIONS - STT 26)
  // =========================================================================
  const [myPermissions, setMyPermissions] = useState([]);
  const [myPermsLoading, setMyPermsLoading] = useState(false);

  const fetchMyPermissions = useCallback(async () => {
    setMyPermsLoading(true);
    try {
      const data = await adminRoleApi.getMyPermissions();
      setMyPermissions(data || []);
    } catch (err) {
      console.error('Failed to load my permissions:', err);
    } finally {
      setMyPermsLoading(false);
    }
  }, []);

  // =========================================================================
  // 7. TAB: QUẢN LÝ ĐƠN HÀNG (ADMIN ORDERS)
  // =========================================================================
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotalElements, setOrderTotalElements] = useState(0);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderShopFilter, setOrderShopFilter] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);

  // Status Change Target & Cancel Modal
  const [statusChangeTarget, setStatusChangeTarget] = useState(null);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  const formatAdminDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getOrderStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':
        return { label: 'Chờ xác nhận', color: '#ea580c', bg: '#fff7ed' };
      case 'CONFIRMED':
        return { label: 'Đã xác nhận', color: '#2563eb', bg: '#eff6ff' };
      case 'PROCESSING':
        return { label: 'Đang đóng gói', color: '#7c3aed', bg: '#f5f3ff' };
      case 'SHIPPED':
        return { label: 'Đang vận chuyển', color: '#d97706', bg: '#fffbeb' };
      case 'DELIVERED':
        return { label: 'Đã giao thành công', color: '#059669', bg: '#ecfdf5' };
      case 'CANCELLED':
        return { label: 'Đã hủy', color: '#dc2626', bg: '#fef2f2' };
      default:
        return { label: status || '—', color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const fetchAdminOrders = useCallback(async (page = 0) => {
    setAdminOrdersLoading(true);
    try {
      const res = await orderApi.getAdminOrders({
        page,
        size: 10,
        status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
        shopId: orderShopFilter || undefined
      });
      if (res) {
        setAdminOrders(res.content || []);
        setOrderPage(res.pageNumber || 0);
        setOrderTotalPages(res.totalPages || 1);
        setOrderTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
      triggerAlert(err.message || 'Không thể tải danh sách đơn hàng.', 'error');
    } finally {
      setAdminOrdersLoading(false);
    }
  }, [orderStatusFilter, orderShopFilter]);

  const handleUpdateOrderStatus = async () => {
    if (!statusChangeTarget) return;
    setStatusChangeLoading(true);
    try {
      const { order, newStatus, newPaymentStatus } = statusChangeTarget;
      await orderApi.updateOrderStatus(order.id, {
        status: newStatus,
        paymentStatus: newPaymentStatus,
        cancelReason: newStatus === 'CANCELLED' ? (cancelReasonInput || 'Hủy bởi Quản trị viên') : undefined
      });
      triggerAlert(`Đã cập nhật đơn hàng #${order.id} sang trạng thái "${newStatus}".`, 'success');
      setStatusChangeTarget(null);
      setCancelReasonInput('');
      fetchAdminOrders(orderPage);
    } catch (err) {
      triggerAlert(err.message || 'Không thể cập nhật trạng thái đơn hàng.', 'error');
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const handleViewAdminOrderDetail = async (order) => {
    try {
      const detail = await orderApi.getOrderDetail(order.id);
      setSelectedOrderForDetail(detail || order);
    } catch (err) {
      setSelectedOrderForDetail(order);
    }
  };

  // =========================================================================
  // 8. TAB: KÊNH CỬA HÀNG (SHOP PRODUCTS - STT 45-56)
  // =========================================================================
  const [selectedShopId, setSelectedShopId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shopId') || '';
  });
  const [shopProducts, setShopProducts] = useState([]);
  const [shopProductsLoading, setShopProductsLoading] = useState(false);
  const [shopProdPage, setShopProdPage] = useState(0);
  const [shopProdTotalPages, setShopProdTotalPages] = useState(1);
  const [shopProdTotalElements, setShopProdTotalElements] = useState(0);
  const [shopProdKeyword, setShopProdKeyword] = useState('');
  const [shopProdStatusFilter, setShopProdStatusFilter] = useState('');

  // Modals for Variants & Images
  const [activeShopProduct, setActiveShopProduct] = useState(null);

  // Variant Modal State (STT 51-53)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [productVariants, setProductVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    color: '',
    storage: '',
    price: '',
    originalPrice: '',
    stockQuantity: 10,
    imageUrl: ''
  });
  const [variantSubmitting, setVariantSubmitting] = useState(false);

  // Image Modal State (STT 54-56)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageForm, setImageForm] = useState({
    imageUrl: '',
    isPrimary: false,
    sortOrder: 0
  });
  const [imageSubmitting, setImageSubmitting] = useState(false);

  // Delete product target
  const [shopProductToDelete, setShopProductToDelete] = useState(null);
  const [isDeletingShopProduct, setIsDeletingShopProduct] = useState(false);

  const fetchShopProducts = useCallback(async (page = 0) => {
    if (!selectedShopId) return;
    setShopProductsLoading(true);
    try {
      const res = await productApi.getShopManagedProducts(selectedShopId, {
        page,
        size: 10,
        keyword: shopProdKeyword.trim() || undefined,
        status: shopProdStatusFilter || undefined,
        sortBy: 'id',
        sortDir: 'desc'
      });
      if (res) {
        setShopProducts(res.content || []);
        setShopProdPage(res.pageNumber || 0);
        setShopProdTotalPages(res.totalPages || 1);
        setShopProdTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load shop managed products:', err);
      triggerAlert(err.message || 'Không thể tải danh sách sản phẩm cửa hàng.', 'error');
    } finally {
      setShopProductsLoading(false);
    }
  }, [selectedShopId, shopProdKeyword, shopProdStatusFilter]);

  // Handle Shop Product Status Toggle (STT 49)
  const handleToggleShopProductStatus = async (prod) => {
    const nextStatus = prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await productApi.updateShopProductStatus(selectedShopId, prod.id, nextStatus);
      triggerAlert(`Đã chuyển trạng thái sản phẩm sang "${nextStatus}".`, 'success');
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi cập nhật trạng thái sản phẩm.', 'error');
    }
  };

  // Handle Delete Shop Product (STT 50)
  const handleDeleteShopProduct = async () => {
    if (!shopProductToDelete) return;
    setIsDeletingShopProduct(true);
    try {
      await productApi.deleteShopProduct(selectedShopId, shopProductToDelete.id, true);
      triggerAlert(`Đã xóa sản phẩm #${shopProductToDelete.id}.`, 'success');
      setShopProductToDelete(null);
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi xóa sản phẩm.', 'error');
    } finally {
      setIsDeletingShopProduct(false);
    }
  };

  // Open Variants Modal (STT 51-53)
  const handleOpenVariantsModal = async (prod) => {
    setActiveShopProduct(prod);
    setIsVariantModalOpen(true);
    setEditingVariant(null);
    setVariantForm({
      sku: '',
      color: '',
      storage: '',
      price: prod.price || '',
      originalPrice: prod.originalPrice || '',
      stockQuantity: 10,
      imageUrl: prod.primaryImage || ''
    });
    setVariantsLoading(true);
    try {
      const vars = await productApi.getProductVariants(prod.id);
      setProductVariants(vars || []);
    } catch (err) {
      console.error('Failed to load variants:', err);
      setProductVariants(prod.variants || []);
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleSaveVariant = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!activeShopProduct) return;
    setVariantSubmitting(true);
    try {
      const payload = {
        sku: variantForm.sku?.trim() || `${activeShopProduct.id}-${Date.now().toString().slice(-4)}`,
        color: variantForm.color?.trim() || null,
        storage: variantForm.storage?.trim() || null,
        price: Number(variantForm.price) || 0,
        originalPrice: variantForm.originalPrice ? Number(variantForm.originalPrice) : null,
        stockQuantity: Number(variantForm.stockQuantity) || 0,
        imageUrl: variantForm.imageUrl?.trim() || null
      };

      if (editingVariant) {
        // STT 52: PATCH /shops/{shopId}/products/{productId}/variants/{variantId}
        await productApi.updateShopProductVariant(selectedShopId, activeShopProduct.id, editingVariant.id, payload);
        triggerAlert('Đã cập nhật biến thể thành công.', 'success');
      } else {
        // STT 51: POST /shops/{shopId}/products/{productId}/variants
        await productApi.createShopProductVariant(selectedShopId, activeShopProduct.id, payload);
        triggerAlert('Đã thêm biến thể mới thành công.', 'success');
      }

      // Reload variants
      const updatedVars = await productApi.getProductVariants(activeShopProduct.id);
      setProductVariants(updatedVars || []);
      setEditingVariant(null);
      setVariantForm({
        sku: '',
        color: '',
        storage: '',
        price: activeShopProduct.price || '',
        originalPrice: activeShopProduct.originalPrice || '',
        stockQuantity: 10,
        imageUrl: activeShopProduct.primaryImage || ''
      });
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi lưu biến thể.', 'error');
    } finally {
      setVariantSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!activeShopProduct) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa biến thể này?')) return;
    try {
      // STT 53: DELETE /shops/{shopId}/products/{productId}/variants/{variantId}
      await productApi.deleteShopProductVariant(selectedShopId, activeShopProduct.id, variantId, true);
      triggerAlert('Đã xóa biến thể thành công.', 'success');
      const updatedVars = await productApi.getProductVariants(activeShopProduct.id);
      setProductVariants(updatedVars || []);
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi xóa biến thể.', 'error');
    }
  };

  // Open Images Modal (STT 54-56)
  const handleOpenImagesModal = async (prod) => {
    setActiveShopProduct(prod);
    setIsImageModalOpen(true);
    setImageForm({
      imageUrl: '',
      isPrimary: false,
      sortOrder: (prod.images?.length || 0) + 1
    });
    setImagesLoading(true);
    try {
      const imgs = await productApi.getProductImages(prod.id);
      setProductImages(imgs || []);
    } catch (err) {
      console.error('Failed to load images:', err);
      setProductImages(prod.images || []);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleSaveImage = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!activeShopProduct || !imageForm.imageUrl.trim()) return;
    setImageSubmitting(true);
    try {
      const payload = {
        imageUrl: imageForm.imageUrl.trim(),
        isPrimary: Boolean(imageForm.isPrimary),
        sortOrder: Number(imageForm.sortOrder) || 0
      };

      // STT 54: POST /shops/{shopId}/products/{productId}/images
      await productApi.addShopProductImage(selectedShopId, activeShopProduct.id, payload);
      triggerAlert('Đã thêm hình ảnh thành công.', 'success');

      // Reload images
      const updatedImgs = await productApi.getProductImages(activeShopProduct.id);
      setProductImages(updatedImgs || []);
      setImageForm({
        imageUrl: '',
        isPrimary: false,
        sortOrder: (updatedImgs?.length || 0) + 1
      });
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi thêm ảnh.', 'error');
    } finally {
      setImageSubmitting(false);
    }
  };

  const handleSetShopPrimaryImage = async (img) => {
    if (!activeShopProduct) return;
    try {
      // STT 55: PATCH /shops/{shopId}/products/{productId}/images/{imageId}
      await productApi.updateShopProductImage(selectedShopId, activeShopProduct.id, img.id, {
        isPrimary: true,
        sortOrder: img.sortOrder || 0
      });
      triggerAlert('Đã đặt làm ảnh chính.', 'success');
      const updatedImgs = await productApi.getProductImages(activeShopProduct.id);
      setProductImages(updatedImgs || []);
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi cập nhật ảnh.', 'error');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!activeShopProduct) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) return;
    try {
      // STT 56: DELETE /shops/{shopId}/products/{productId}/images/{imageId}
      await productApi.deleteShopProductImage(selectedShopId, activeShopProduct.id, imageId);
      triggerAlert('Đã xóa ảnh thành công.', 'success');
      const updatedImgs = await productApi.getProductImages(activeShopProduct.id);
      setProductImages(updatedImgs || []);
      fetchShopProducts(shopProdPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi xóa ảnh.', 'error');
    }
  };

  // ===================================================================
  // STATE & LOGIC: QUẢN TRỊ CỬA HÀNG (ADMIN SHOPS - STT 67-69)
  // ===================================================================
  const [adminShops, setAdminShops] = useState([]);
  const [adminShopsLoading, setAdminShopsLoading] = useState(false);
  const [adminShopsPage, setAdminShopsPage] = useState(0);
  const [adminShopsTotalPages, setAdminShopsTotalPages] = useState(1);
  const [adminShopsTotalElements, setAdminShopsTotalElements] = useState(0);
  const [adminShopsKeyword, setAdminShopsKeyword] = useState('');
  const [adminShopsStatusFilter, setAdminShopsStatusFilter] = useState('');
  const [selectedAdminShop, setSelectedAdminShop] = useState(null);
  const [showAdminShopDetailModal, setShowAdminShopDetailModal] = useState(false);
  const [showAdminShopStatusModal, setShowAdminShopStatusModal] = useState(false);
  const [targetShopForStatus, setTargetShopForStatus] = useState(null);
  const [newShopStatus, setNewShopStatus] = useState('ACTIVE');
  const [shopRejectionReason, setShopRejectionReason] = useState('');
  const [updatingShopStatus, setUpdatingShopStatus] = useState(false);

  const fetchAdminShops = useCallback(async (page = 0) => {
    setAdminShopsLoading(true);
    try {
      const res = await shopApi.getAdminShops({
        keyword: adminShopsKeyword.trim() || undefined,
        status: adminShopsStatusFilter || undefined,
        page,
        size: 10
      });
      if (res) {
        setAdminShops(res.content || []);
        setAdminShopsPage(res.pageNumber || 0);
        setAdminShopsTotalPages(res.totalPages || 1);
        setAdminShopsTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load admin shops:', err);
      triggerAlert(err.message || 'Không thể tải danh sách cửa hàng quản trị.', 'error');
    } finally {
      setAdminShopsLoading(false);
    }
  }, [adminShopsKeyword, adminShopsStatusFilter]);

  const handleViewAdminShopDetail = async (shopId) => {
    try {
      const res = await shopApi.getAdminShopById(shopId);
      setSelectedAdminShop(res);
      setShowAdminShopDetailModal(true);
    } catch (err) {
      triggerAlert(err.message || 'Không thể lấy thông tin chi tiết cửa hàng.', 'error');
    }
  };

  const handleOpenShopStatusModal = (shop, defaultStatus) => {
    setTargetShopForStatus(shop);
    setNewShopStatus(defaultStatus || (shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'));
    setShopRejectionReason('');
    setShowAdminShopStatusModal(true);
  };

  const handleSaveShopStatus = async () => {
    if (!targetShopForStatus) return;
    try {
      setUpdatingShopStatus(true);
      await shopApi.updateAdminShopStatus(targetShopForStatus.id, {
        status: newShopStatus,
        rejectionReason: (newShopStatus === 'REJECTED' || newShopStatus === 'SUSPENDED') ? shopRejectionReason : null
      });
      triggerAlert(`Đã cập nhật trạng thái cửa hàng "${targetShopForStatus.name}" thành "${newShopStatus}".`, 'success');
      setShowAdminShopStatusModal(false);
      fetchAdminShops(adminShopsPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi cập nhật trạng thái cửa hàng.', 'error');
    } finally {
      setUpdatingShopStatus(false);
    }
  };

  // ===================================================================
  // STATE & LOGIC: QUẢN LÝ TỒN KHO CỬA HÀNG (INVENTORY - STT 70-73)
  // ===================================================================
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1);
  const [inventoryTotalElements, setInventoryTotalElements] = useState(0);
  const [inventoryKeyword, setInventoryKeyword] = useState('');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustChangeQuantity, setAdjustChangeQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustingLoading, setAdjustingLoading] = useState(false);

  const fetchInventory = useCallback(async (page = 0) => {
    if (!selectedShopId) return;
    setInventoryLoading(true);
    try {
      if (isLowStockOnly) {
        const res = await inventoryApi.getLowStockInventory(selectedShopId, lowStockThreshold);
        const items = Array.isArray(res) ? res : [];
        setInventoryList(items);
        setInventoryPage(0);
        setInventoryTotalPages(1);
        setInventoryTotalElements(items.length);
      } else {
        const res = await inventoryApi.getShopInventory(selectedShopId, {
          keyword: inventoryKeyword.trim() || undefined,
          page,
          size: 10
        });
        if (res) {
          setInventoryList(res.content || []);
          setInventoryPage(res.pageNumber || 0);
          setInventoryTotalPages(res.totalPages || 1);
          setInventoryTotalElements(res.totalElements || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load shop inventory:', err);
      triggerAlert(err.message || 'Không thể tải dữ liệu tồn kho.', 'error');
    } finally {
      setInventoryLoading(false);
    }
  }, [selectedShopId, inventoryKeyword, isLowStockOnly, lowStockThreshold]);

  const handleOpenAdjustModal = (item) => {
    setSelectedInventoryItem(item);
    setAdjustChangeQuantity(0);
    setAdjustReason('Kiểm kê kho định kỳ');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustInventory = async () => {
    if (!selectedInventoryItem || !selectedShopId) return;
    const qty = Number(adjustChangeQuantity);
    if (!qty || isNaN(qty)) {
      triggerAlert('Vui lòng nhập số lượng thay đổi khác 0 (ví dụ: +10 để nhập thêm hoặc -5 để xuất bớt).', 'warning');
      return;
    }
    try {
      setAdjustingLoading(true);
      await inventoryApi.adjustInventory(selectedShopId, selectedInventoryItem.variantId, {
        changeQuantity: qty,
        reason: adjustReason.trim() || 'Điều chỉnh tồn kho'
      });
      triggerAlert(`Đã điều chỉnh tồn kho phiên bản "${selectedInventoryItem.variantName}" thành công!`, 'success');
      setShowAdjustModal(false);
      fetchInventory(inventoryPage);
    } catch (err) {
      triggerAlert(err.message || 'Lỗi khi điều chỉnh tồn kho.', 'error');
    } finally {
      setAdjustingLoading(false);
    }
  };

  // Check admin role permission
  const isAdminUser = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    if (r === 'ADMIN' || r === 'ROLE_ADMIN') return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(roleItem => {
        const code = (typeof roleItem === 'string' ? roleItem : roleItem?.code || '').toUpperCase();
        return code === 'ADMIN' || code === 'ROLE_ADMIN';
      });
    }
    return false;
  }, [user]);

  // Check shop manager role permission
  const isShopManager = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    if (r === 'SHOP_MANAGER' || r === 'ROLE_SHOP_MANAGER' || r === 'SHOP_OWNER') return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(roleItem => {
        const code = (typeof roleItem === 'string' ? roleItem : roleItem?.code || '').toUpperCase();
        return code === 'SHOP_MANAGER' || code === 'ROLE_SHOP_MANAGER' || code === 'SHOP_OWNER';
      });
    }
    return false;
  }, [user]);

  const hasPortalAccess = isAdminUser || isShopManager;

  // Shop info for shop manager / admin
  const [myShopInfo, setMyShopInfo] = useState(null);
  const [availableShops, setAvailableShops] = useState([]);

  // =========================================================================
  // REVENUE & ANALYTICS STATE (ADMIN ONLY)
  // =========================================================================
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueShopFilter, setRevenueShopFilter] = useState('');
  const [revenueTimeFilter, setRevenueTimeFilter] = useState('all');

  const fetchPlatformRevenue = useCallback(async () => {
    if (!isAdminUser) return;
    setRevenueLoading(true);
    try {
      const data = await revenueApi.getPlatformRevenue({
        shopId: revenueShopFilter ? Number(revenueShopFilter) : undefined,
        timeRange: revenueTimeFilter !== 'all' ? revenueTimeFilter : undefined
      });
      if (data) {
        setRevenueData(data);
      }
    } catch (err) {
      console.error('Failed to load platform revenue report:', err);
      triggerAlert(err.message || 'Không thể tải báo cáo doanh thu toàn hệ thống.', 'error');
    } finally {
      setRevenueLoading(false);
    }
  }, [isAdminUser, revenueShopFilter, revenueTimeFilter]);

  // Preload base metadata on mount
  useEffect(() => {
    fetchCategories();
    fetchBrands();
    if (isAdminUser) {
      fetchPlatformRevenue();
    }
  }, [fetchCategories, fetchBrands, isAdminUser, fetchPlatformRevenue]);

  useEffect(() => {
    if (isAuthenticated && hasPortalAccess) {
      shopApi.getMyShop()
        .then((res) => {
          if (res?.data) {
            setMyShopInfo(res.data);
            if (isShopManager && !isAdminUser) {
              setSelectedShopId(String(res.data.id));
            } else if (isAdminUser) {
              setSelectedShopId(prev => prev || String(res.data.id));
            }
          } else if (isAdminUser) {
            setSelectedShopId(prev => prev || '1');
          }
        })
        .catch((e) => {
          console.warn('Could not fetch my shop:', e);
          if (isAdminUser) {
            setSelectedShopId(prev => prev || '1');
          }
        });

      if (isAdminUser) {
        shopApi.getAllShops()
          .then((res) => {
            const list = Array.isArray(res?.data) ? res.data : (res?.data?.content || []);
            if (list.length > 0) {
              setAvailableShops(list);
              setSelectedShopId(prev => prev || String(list[0].id));
            }
          })
          .catch(() => {});
      }
    }
  }, [isAuthenticated, hasPortalAccess, isAdminUser, isShopManager]);

  // Sync data on tab change
  useEffect(() => {
    if (isAdminUser) {
      if (activeTab === 'revenue') {
        fetchPlatformRevenue();
      } else if (activeTab === 'users') {
        fetchUsers(userPage);
        if (roles.length === 0) fetchRolesAndPermissions();
      } else if (activeTab === 'roles') {
        fetchRolesAndPermissions();
      } else if (activeTab === 'categories') {
        fetchCategories();
      } else if (activeTab === 'brands') {
        fetchBrands();
      } else if (activeTab === 'admin-shops') {
        fetchAdminShops(adminShopsPage);
      }
    } else if (isShopManager) {
      if (activeTab === 'shops') {
        fetchShopProducts(shopProdPage);
      } else if (activeTab === 'inventory') {
        fetchInventory(inventoryPage);
      } else if (activeTab === 'orders') {
        fetchAdminOrders(orderPage);
      } else if (activeTab === 'coupons') {
        fetchCoupons(couponPage);
      } else if (activeTab === 'permissions') {
        fetchMyPermissions();
      }
    }
  }, [activeTab, isAdminUser, isShopManager, fetchPlatformRevenue, fetchUsers, fetchRolesAndPermissions, fetchCategories, fetchBrands, fetchAdminShops, fetchShopProducts, fetchInventory, fetchAdminOrders, fetchCoupons, fetchMyPermissions, userPage, adminShopsPage, shopProdPage, inventoryPage, orderPage, couponPage, roles.length]);

  // Strict Role Separation for Portal Tabs
  useEffect(() => {
    if (isShopManager && !isAdminUser) {
      const allowedShopTabs = ['shops', 'inventory', 'orders', 'coupons', 'permissions'];
      if (!allowedShopTabs.includes(activeTab)) {
        setActiveTab('shops');
      }
    } else if (isAdminUser) {
      const allowedAdminTabs = ['revenue', 'admin-shops', 'users', 'roles', 'categories', 'brands'];
      if (!allowedAdminTabs.includes(activeTab)) {
        setActiveTab('revenue');
      }
    }
  }, [isShopManager, isAdminUser, activeTab]);

  // Access Denied Screen if user is neither ADMIN nor SHOP_MANAGER
  if (!isAuthenticated || !hasPortalAccess) {
    return (
      <div className="cyber-admin-page">
        <div className="container">
          <div className="admin-forbidden-view">
            <div className="admin-forbidden-icon-wrap">
              <Lock size={32} />
            </div>
            <h2>Khu vực Quản trị & Kênh Người Bán</h2>
            <p>
              Bạn cần có tài khoản Quản trị viên (<strong>ADMIN</strong>) hoặc Kênh Người Bán (<strong>SHOP_MANAGER</strong>) để truy cập giao diện này.
            </p>
            <div className="admin-forbidden-actions">
              <Link to="/login?redirect=/admin" className="admin-btn-action-primary">
                Đăng nhập tài khoản
              </Link>
              <Link to="/" className="admin-btn-action-secondary">
                <ArrowLeft size={16} />
                Về Trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-admin-page">
      <div className="container">
        {/* =================================================================== */}
        {/* TOP HEADER BANNER */}
        {/* =================================================================== */}
        <div className="admin-header-banner">
          <div className="admin-header-left">
            <div className="admin-shield-icon-wrap" style={{ backgroundColor: isShopManager && !isAdminUser ? '#10b981' : undefined }}>
              {isShopManager && !isAdminUser ? <Store size={26} strokeWidth={2.2} /> : <ShieldCheck size={26} strokeWidth={2.2} />}
            </div>
            <div className="admin-title-group">
              <h1>
                {isAdminUser ? 'Trung tâm Quản trị Cyber' : 'Kênh Người Bán Cyber'}
                <span className="admin-role-badge">
                  {isAdminUser ? 'Quản trị viên Hệ thống' : (myShopInfo?.name || 'Shop Manager')}
                </span>
              </h1>
              <p>
                {isAdminUser
                  ? 'Quản lý người dùng & phân quyền, kiểm duyệt cửa hàng, giám sát doanh thu toàn hệ thống, danh mục và thương hiệu'
                  : `Quản lý cửa hàng ${myShopInfo?.name ? `"${myShopInfo.name}"` : (selectedShopId ? `#${selectedShopId}` : '')}: đăng sản phẩm, tồn kho, đơn hàng và khuyến mãi`}
              </p>
            </div>
          </div>

          <div className="admin-header-right">
            <div className="admin-identity-pill">
              <img src={user.avatar} alt={user.name} />
              <span>{user.name}</span>
              <span className="admin-role-badge">{user.role}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isAdminUser) {
                  if (activeTab === 'revenue') fetchPlatformRevenue();
                  if (activeTab === 'users') fetchUsers(userPage);
                  if (activeTab === 'roles') fetchRolesAndPermissions();
                  if (activeTab === 'categories') fetchCategories();
                  if (activeTab === 'brands') fetchBrands();
                  if (activeTab === 'admin-shops') fetchAdminShops(adminShopsPage);
                } else {
                  if (activeTab === 'shops') fetchShopProducts(shopProdPage);
                  if (activeTab === 'inventory') fetchInventory(inventoryPage);
                  if (activeTab === 'orders') fetchAdminOrders(orderPage);
                  if (activeTab === 'coupons') fetchCoupons(couponPage);
                  if (activeTab === 'permissions') fetchMyPermissions();
                }
                triggerAlert('Đã làm mới dữ liệu từ máy chủ.', 'info');
              }}
              className="admin-btn-back-store"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} />
              Làm mới
            </button>
            <a
              href="/swagger-ui/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-back-store"
              title="Mở tài liệu OpenAPI 3.0 & Swagger UI"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', textDecoration: 'none' }}
            >
              <ExternalLink size={15} />
              Tài liệu API (Swagger)
            </a>
            <Link to="/" className="admin-btn-back-store">
              <ArrowLeft size={15} />
              Về Cửa hàng
            </Link>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ALERT NOTIFICATION BANNER */}
        {/* =================================================================== */}
        {alert && (
          <div className={`admin-alert-banner ${alert.type}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {alert.type === 'success' && <CheckCircle2 size={18} />}
              {alert.type === 'error' && <AlertTriangle size={18} />}
              {alert.type === 'info' && <Info size={18} />}
              <span>{alert.message}</span>
            </div>
            <button type="button" onClick={() => setAlert(null)} className="admin-alert-close-btn">
              <X size={16} />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* METRIC HIGHLIGHTS CARDS */}
        {/* =================================================================== */}
        {isAdminUser ? (
          <div className="admin-metrics-grid">
            <div className="admin-metric-card" onClick={() => setActiveTab('revenue')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
                <TrendingUp size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Doanh thu Toàn sàn</div>
                <div className="admin-metric-val" style={{ color: '#059669', fontSize: '1.25rem' }}>
                  {formatVND(revenueData?.totalRevenue || 0)}
                </div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('revenue')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShoppingBag size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Tổng Đơn Hệ thống</div>
                <div className="admin-metric-val">{revenueData?.totalOrders || 0} đơn hàng</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('admin-shops')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Store size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Quản trị Cửa hàng</div>
                <div className="admin-metric-val">{adminShopsTotalElements || adminShops.length || 0} cửa hàng</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap users">
                <Users size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Tổng Người dùng</div>
                <div className="admin-metric-val">{userTotalElements || users.length} tài khoản</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('categories')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap categories">
                <FolderTree size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Danh mục & Hãng</div>
                <div className="admin-metric-val">{categories.length} danh mục / {brands.length} hãng</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-metrics-grid">
            <div className="admin-metric-card" onClick={() => setActiveTab('shops')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap products" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Store size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Sản phẩm Cửa hàng</div>
                <div className="admin-metric-val">{shopProdTotalElements || shopProducts.length} sản phẩm</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap roles" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShoppingBag size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Đơn hàng Cửa hàng</div>
                <div className="admin-metric-val">{adminOrders.length} đơn hàng</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('inventory')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Archive size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Tồn kho Kho hàng</div>
                <div className="admin-metric-val">{inventoryTotalElements || inventoryItems.length} mặt hàng</div>
              </div>
            </div>

            <div className="admin-metric-card" onClick={() => setActiveTab('permissions')} style={{ cursor: 'pointer' }}>
              <div className="admin-metric-icon-wrap brands" style={{ background: '#faf5ff', color: '#7c3aed' }}>
                <Key size={22} />
              </div>
              <div className="admin-metric-info">
                <div className="admin-metric-label">Quyền hạn Shop</div>
                <div className="admin-metric-val">{myPermissions.length || 15} quyền được cấp</div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TOP LEVEL NAVIGATION TABS */}
        {/* =================================================================== */}
        <div className="admin-tabs-bar">
          {isAdminUser && (
            <>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
                onClick={() => setActiveTab('revenue')}
              >
                <TrendingUp size={17} />
                Quản lý Doanh thu Hệ thống
                <span className="admin-tab-badge">Tài chính</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'admin-shops' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-shops')}
              >
                <Store size={17} />
                Quản lý Cửa hàng
                <span className="admin-tab-badge">STT 67-69</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={17} />
                Quản lý Người dùng
                <span className="admin-tab-badge">STT 12-17</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('roles')}
              >
                <ShieldCheck size={17} />
                Vai trò & Phân quyền
                <span className="admin-tab-badge">STT 18-25</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                <FolderTree size={17} />
                Danh mục Sản phẩm
                <span className="admin-tab-badge">STT 27-32</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'brands' ? 'active' : ''}`}
                onClick={() => setActiveTab('brands')}
              >
                <Award size={17} />
                Thương hiệu
                <span className="admin-tab-badge">STT 33-38</span>
              </button>
            </>
          )}

          {!isAdminUser && isShopManager && (
            <>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'shops' ? 'active' : ''}`}
                onClick={() => setActiveTab('shops')}
              >
                <Box size={17} />
                Sản phẩm Cửa hàng
                <span className="admin-tab-badge">STT 45-56</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <Archive size={17} />
                Quản lý Kho
                <span className="admin-tab-badge">STT 70-73</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <ShoppingBag size={17} />
                Đơn hàng Cửa hàng
                <span className="admin-tab-badge">Đơn hàng</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                onClick={() => setActiveTab('coupons')}
              >
                <Ticket size={17} />
                Mã Giảm Giá Shop
                <span className="admin-tab-badge">Coupon</span>
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('permissions')}
              >
                <Key size={17} />
                Quyền hạn của tôi
                <span className="admin-tab-badge">STT 26</span>
              </button>
            </>
          )}
        </div>

        {/* =================================================================== */}
        {/* TAB 0: QUẢN LÝ DOANH THU TOÀN BỘ HỆ THỐNG (ADMIN ONLY) */}
        {/* =================================================================== */}
        {activeTab === 'revenue' && isAdminUser && (
          <div className="admin-card-container">
            {/* Toolbar Filter */}
            <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
              <div className="admin-toolbar-left" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                  <TrendingUp size={22} color="#059669" />
                  <span>Báo Cáo Doanh Thu & Dòng Tiền Toàn Hệ Thống</span>
                </div>

                {/* Chọn Shop nếu muốn xem chi tiết doanh thu từng shop */}
                <select
                  className="admin-select-filter"
                  style={{ fontWeight: 600, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
                  value={revenueShopFilter}
                  onChange={(e) => setRevenueShopFilter(e.target.value)}
                >
                  <option value="">🏬 Tất cả cửa hàng trên sàn</option>
                  {availableShops.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      🏪 #{s.id}: {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-toolbar-right" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn-action-secondary"
                  onClick={fetchPlatformRevenue}
                  disabled={revenueLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem' }}
                >
                  <RefreshCw size={14} className={revenueLoading ? 'animate-spin' : ''} />
                  {revenueLoading ? 'Đang cập nhật...' : 'Cập nhật số liệu'}
                </button>
              </div>
            </div>

            {/* 4 THẺ CHỈ SỐ DOANH THU LỚN */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              padding: '1.25rem'
            }}>
              {/* Card 1: Doanh thu thực nhận */}
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Doanh thu thực nhận
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                      {formatVND(revenueData?.totalRevenue || 0)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.75rem' }}>
                  ✓ Đã giao thành công hoặc đã thanh toán
                </div>
              </div>

              {/* Card 2: Tổng giá trị GMV */}
              <div style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tổng giá trị sàn (GMV)
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                      {formatVND(revenueData?.grossMerchandiseValue || 0)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                    <DollarSign size={24} />
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.75rem' }}>
                  📊 Toàn bộ đơn hàng hợp lệ phát sinh
                </div>
              </div>

              {/* Card 3: Tổng đơn hàng & Trạng thái */}
              <div style={{
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tổng đơn hàng sàn
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                      {revenueData?.totalOrders || 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>đơn</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                    <ShoppingBag size={24} />
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.75rem' }}>
                  {revenueData?.completedOrders || 0} hoàn tất • {revenueData?.processingOrders || 0} đang giao • {revenueData?.cancelledOrders || 0} đã hủy
                </div>
              </div>

              {/* Card 4: Giá trị trung bình đơn AOV */}
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Giá trị TB / đơn (AOV)
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                      {formatVND(revenueData?.averageOrderValue || 0)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.6rem', borderRadius: '10px' }}>
                    <CreditCard size={24} />
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.75rem' }}>
                  ⚡ Trung bình mỗi giỏ hàng chi tiêu
                </div>
              </div>
            </div>

            {/* BIỂU ĐỒ DOANH THU 7 NGÀY GẦN NHẤT */}
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1e293b' }}>
                    <BarChart3 size={18} color="#2563eb" />
                    <span>Xu hướng Doanh thu 7 ngày gần nhất</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đơn vị tính: VNĐ</span>
                </div>

                {revenueData?.dailyRevenues && revenueData.dailyRevenues.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    height: '160px',
                    paddingTop: '20px',
                    borderBottom: '1px solid #cbd5e1'
                  }}>
                    {(() => {
                      const maxDaily = Math.max(...revenueData.dailyRevenues.map(d => Number(d.revenue) || 0), 100000);
                      return revenueData.dailyRevenues.map((day, idx) => {
                        const heightPct = Math.min(100, Math.max(12, ((Number(day.revenue) || 0) / maxDaily) * 100));
                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                              {Number(day.revenue) > 0 ? (Number(day.revenue) >= 1000000 ? `${(Number(day.revenue) / 1000000).toFixed(1)}M` : `${(Number(day.revenue) / 1000).toFixed(0)}k`) : '0'}
                            </div>
                            <div
                              title={`${day.date}: ${formatVND(day.revenue)} (${day.orderCount} đơn)`}
                              style={{
                                width: '80%',
                                maxWidth: '42px',
                                height: `${heightPct}%`,
                                background: Number(day.revenue) > 0 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                                borderRadius: '6px 6px 0 0',
                                transition: 'height 0.3s ease'
                              }}
                            />
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginTop: '6px' }}>
                              {day.date}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              {day.orderCount} đơn
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Chưa có giao dịch phát sinh trong tuần này.
                  </div>
                )}
              </div>
            </div>

            {/* BẢNG 1: DOANH THU THEO TỪNG CỬA HÀNG */}
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={18} color="#059669" />
                  Bảng Phân Bổ Doanh Thu Theo Từng Cửa Hàng
                </h3>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{revenueData?.shopRevenues?.length || 0}</strong> cửa hàng
                </span>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Mã Shop</th>
                      <th>Tên Cửa Hàng</th>
                      <th>Chủ Sở Hữu</th>
                      <th>Liên Hệ</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: 'center' }}>Số Đơn Hàng</th>
                      <th style={{ textAlign: 'right' }}>Doanh Thu Thực Nhận</th>
                      <th style={{ textAlign: 'right' }}>Doanh Thu Đang Chờ</th>
                      <th style={{ textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData?.shopRevenues && revenueData.shopRevenues.length > 0 ? (
                      revenueData.shopRevenues.map((s) => (
                        <tr key={s.shopId}>
                          <td><strong>#{s.shopId}</strong></td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.shopName}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.ownerName || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.ownerEmail || ''}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8125rem', color: '#334155' }}>{s.shopPhone || '—'}</div>
                          </td>
                          <td>
                            <span className={`admin-status-badge ${s.shopStatus === 'ACTIVE' ? 'active' : 'inactive'}`}>
                              {s.shopStatus === 'ACTIVE' ? 'Đang hoạt động' : s.shopStatus}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {s.totalOrders}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            {formatVND(s.totalRevenue || 0)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#d97706' }}>
                            {formatVND(s.pendingRevenue || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="admin-btn-action-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => {
                                handleViewAdminShopDetail(s.shopId);
                                setActiveTab('admin-shops');
                              }}
                            >
                              <Eye size={13} /> Xem Shop
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          Chưa có dữ liệu doanh thu của các shop.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG 2: NHẬT KÝ ĐƠN HÀNG GẦN NHẤT TOÀN SÀN */}
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="#2563eb" />
                  Giao Dịch / Đơn Hàng Gần Nhất Trên Toàn Sàn
                </h3>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>10 giao dịch mới nhất</span>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Cửa Hàng</th>
                      <th>Khách Hàng</th>
                      <th>Tổng Giá Trị</th>
                      <th>Trạng Thái Đơn</th>
                      <th>Thanh Toán</th>
                      <th>Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData?.recentOrders && revenueData.recentOrders.length > 0 ? (
                      revenueData.recentOrders.map((ord) => {
                        const st = getOrderStatusBadge(ord.orderStatus);
                        return (
                          <tr key={ord.orderId}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>
                                #{ord.orderCode || ord.orderId}
                              </strong>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{ord.shopName}</span>
                            </td>
                            <td>{ord.customerName || 'Khách hàng'}</td>
                            <td style={{ fontWeight: 700, color: '#059669' }}>
                              {formatVND(ord.totalAmount || 0)}
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: st.bg,
                                color: st.color
                              }}>
                                {st.label}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: ord.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef2f2',
                                color: ord.paymentStatus === 'PAID' ? '#059669' : '#dc2626'
                              }}>
                                {ord.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                              {ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          Chưa có đơn hàng nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG (USERS - STT 12-17) */}
        {/* =================================================================== */}
        {activeTab === 'users' && isAdminUser && (
          <div className="admin-card-container">
            {/* Toolbar search & filter */}
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Search input */}
                <div className="admin-search-box">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm theo username, email, họ tên..."
                    value={userKeyword}
                    onChange={(e) => setUserKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchUsers(0);
                    }}
                  />
                  {userKeyword && (
                    <button type="button" onClick={() => { setUserKeyword(''); fetchUsers(0); }} className="admin-search-clear">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter by role */}
                <select
                  className="admin-select-filter"
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(0);
                  }}
                >
                  <option value="">Tất cả Vai trò</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  <option value="CLIENT">Khách hàng (CLIENT)</option>
                  <option value="SHOP_MANAGER">Quản lý shop (SHOP_MANAGER)</option>
                </select>

                {/* Filter by status */}
                <select
                  className="admin-select-filter"
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(0);
                  }}
                >
                  <option value="">Tất cả Trạng thái</option>
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="BLOCKED">Đã khóa (BLOCKED)</option>
                  <option value="PENDING">Chờ kích hoạt (PENDING)</option>
                  <option value="INACTIVE">Ngừng dùng (INACTIVE)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchUsers(0)}
                  className="admin-btn-action-primary"
                >
                  <Search size={14} />
                  Tìm kiếm
                </button>
              </div>

              <div className="admin-toolbar-right">
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Tìm thấy <strong>{userTotalElements}</strong> tài khoản
                </span>
              </div>
            </div>

            {/* Table Users */}
            <div className="admin-table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Người dùng</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                        <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>Đang tải danh sách người dùng...</div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        Không tìm thấy người dùng nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const userRolesList = u.roles && u.roles.length > 0
                        ? u.roles.map((r) => (typeof r === 'string' ? r : r.code))
                        : [u.role];
                      const isTargetAdmin = userRolesList.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN');

                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, color: '#64748b' }}>#{u.id}</td>
                          <td>
                            <div className="admin-user-cell">
                              <img
                                src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}
                                alt={u.username}
                                className="admin-user-avatar"
                              />
                              <div className="admin-user-texts">
                                <div className="admin-user-fullname">
                                  {u.fullName || u.username}
                                </div>
                                <div className="admin-user-meta">
                                  <span>@{u.username}</span>
                                  <span>•</span>
                                  <span>{u.email}</span>
                                  {u.emailVerifiedAt && (
                                    <span title="Email đã xác minh" style={{ color: '#16a34a' }}>✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{u.phone || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              {userRolesList.map((rCode) => {
                                const lower = rCode.toLowerCase();
                                return (
                                  <span key={rCode} className={`role-pill ${lower}`}>
                                    {rCode}
                                  </span>
                                );
                              })}
                              {(u.ownsShop || adminShops.some((s) => s.ownerId === u.id && s.status !== 'REJECTED')) && (
                                <span
                                  title={`Chủ sở hữu cửa hàng: ${u.ownedShopName || 'Shop chính thức'}`}
                                  style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    color: '#059669',
                                    background: '#ecfdf5',
                                    padding: '2px 7px',
                                    borderRadius: '12px',
                                    border: '1px solid #a7f3d0'
                                  }}
                                >
                                  🏪 Chủ shop
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${(u.status || '').toLowerCase()}`}>
                              {u.status === 'ACTIVE' && '● Đang hoạt động'}
                              {['BLOCKED', 'LOCKED'].includes(u.status) && '● Đã bị khóa'}
                              {u.status === 'PENDING' && '● Chờ xác thực'}
                              {u.status === 'INACTIVE' && '● Ngừng sử dụng'}
                              {u.status === 'DELETED' && '● Đã xóa mềm'}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td>
                            <div className="admin-table-actions" style={{ justifyContent: 'flex-end' }}>
                              {/* Xem chi tiết (API 13) */}
                              <button
                                type="button"
                                className="admin-icon-btn primary"
                                title="Xem chi tiết người dùng (API 13)"
                                onClick={() => handleOpenUserDetail(u.id)}
                              >
                                <Eye size={15} />
                              </button>

                              {/* Sửa thông tin (API 14) */}
                              <button
                                type="button"
                                className="admin-icon-btn"
                                title="Sửa thông tin quản trị (API 14)"
                                onClick={() => handleOpenEditUser(u)}
                              >
                                <Edit size={15} />
                              </button>

                              {/* Đổi vai trò (API 16 & 17) */}
                              <button
                                type="button"
                                className="admin-icon-btn"
                                title="Gán / Sửa vai trò hệ thống (API 16, 17)"
                                onClick={() => handleOpenRoleAssign(u)}
                              >
                                <Shield size={15} />
                              </button>

                              {/* Khóa / Mở khóa tài khoản (API 15) */}
                              {['BLOCKED', 'LOCKED'].includes(u.status) ? (
                                <button
                                  type="button"
                                  className="admin-icon-btn primary"
                                  title="Mở khóa tài khoản (API 15)"
                                  onClick={() => handleOpenStatusModal(u, 'ACTIVE')}
                                >
                                  <Unlock size={15} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-icon-btn danger"
                                  title={isTargetAdmin && user?.id === u.id ? 'Không thể tự khóa tài khoản Admin của chính mình' : 'Khóa tài khoản (API 15)'}
                                  disabled={isTargetAdmin && user?.id === u.id}
                                  onClick={() => handleOpenStatusModal(u, 'LOCKED')}
                                >
                                  <Lock size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="admin-pagination">
              <div className="admin-pagination-info">
                Trang <strong>{userPage + 1}</strong> trên <strong>{userTotalPages}</strong> ({userTotalElements} tài khoản)
              </div>
              <div className="admin-pagination-btns">
                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={userPage <= 0}
                  onClick={() => {
                    const p = userPage - 1;
                    setUserPage(p);
                    fetchUsers(p);
                  }}
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>

                {Array.from({ length: Math.min(5, userTotalPages) }, (_, idx) => {
                  let pNum = idx;
                  if (userTotalPages > 5 && userPage > 2) {
                    pNum = Math.min(userTotalPages - 5, userPage - 2) + idx;
                  }
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className={`admin-page-btn ${userPage === pNum ? 'active' : ''}`}
                      onClick={() => {
                        setUserPage(pNum);
                        fetchUsers(pNum);
                      }}
                    >
                      {pNum + 1}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="admin-page-btn"
                  disabled={userPage >= userTotalPages - 1}
                  onClick={() => {
                    const p = userPage + 1;
                    setUserPage(p);
                    fetchUsers(p);
                  }}
                >
                  Sau
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: VAI TRÒ & PHÂN QUYỀN (ROLES & PERMISSIONS - STT 18-25) */}
        {/* =================================================================== */}
        {activeTab === 'roles' && isAdminUser && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Quản lý Vai trò Hệ thống & Tùy chỉnh (STT 18 - 25)
                </h2>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Các vai trò cốt lõi (ADMIN, CLIENT, SHOP_MANAGER) được bảo vệ khỏi việc xóa hoặc sửa mã.
                </span>
              </div>
              <div className="admin-toolbar-right">
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  onClick={() => setIsCreateRoleModalOpen(true)}
                >
                  <Plus size={15} />
                  Tạo vai trò mới (API 20)
                </button>
              </div>
            </div>

            {rolesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách vai trò...</div>
              </div>
            ) : (
              <div className="admin-roles-cards-grid">
                {roles.map((r) => {
                  const isProtected = PROTECTED_SYSTEM_ROLES.includes(r.code);
                  const permCount = r.permissions ? r.permissions.length : (r.permissionCount || 0);

                  return (
                    <div key={r.id} className="admin-role-card">
                      <div className="admin-role-card-header">
                        <div className="admin-role-title-box">
                          <h3>
                            {r.name}
                            <span className={`admin-role-system-tag ${isProtected ? 'protected' : 'custom'}`}>
                              {isProtected ? 'Bảo vệ cốt lõi' : 'Tùy chỉnh'}
                            </span>
                          </h3>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                            {r.code}
                          </div>
                        </div>
                      </div>

                      <div className="admin-role-card-desc">
                        {r.description || 'Chưa có mô tả chi tiết cho vai trò này.'}
                      </div>

                      <div className="admin-role-card-footer">
                        <div className="admin-role-perm-count">
                          <strong>{permCount}</strong> quyền được gán
                        </div>
                        <div className="admin-table-actions">
                          {/* Phân quyền (API 24 & 25) */}
                          <button
                            type="button"
                            className="admin-btn-action-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            title="Xem và gán quyền (API 24, 25)"
                            onClick={() => handleOpenAssignPermissions(r)}
                          >
                            <Key size={13} />
                            Phân quyền
                          </button>

                          {/* Sửa vai trò (API 21) */}
                          <button
                            type="button"
                            className="admin-icon-btn"
                            title="Sửa tên / mô tả (API 21)"
                            onClick={() => handleOpenEditRole(r)}
                          >
                            <Edit size={14} />
                          </button>

                          {/* Xóa vai trò tùy chỉnh (API 22) */}
                          <button
                            type="button"
                            className="admin-icon-btn danger"
                            title={isProtected ? 'Vai trò hệ thống không được phép xóa' : 'Xóa vai trò tùy chỉnh (API 22)'}
                            disabled={isProtected}
                            onClick={() => handleOpenDeleteRole(r)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: QUẢN LÝ DANH MỤC SẢN PHẨM (CATEGORIES - STT 27-32) */}
        {/* =================================================================== */}
        {activeTab === 'categories' && isAdminUser && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Danh mục Sản phẩm (Catalog & Categories - STT 27-32)
                </h2>
                <select
                  className="admin-select-filter"
                  value={categoryStatusFilter}
                  onChange={(e) => setCategoryStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả Trạng thái</option>
                  <option value="ACTIVE">Hiển thị (ACTIVE)</option>
                  <option value="INACTIVE">Ẩn / Ngừng dùng (INACTIVE)</option>
                </select>
              </div>

              <div className="admin-toolbar-right">
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  onClick={handleOpenCreateCategory}
                >
                  <Plus size={15} />
                  Tạo danh mục mới (API 30)
                </button>
              </div>
            </div>

            {/* Table Categories */}
            <div className="admin-table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Danh mục</th>
                    <th>Danh mục cha</th>
                    <th>Mô tả</th>
                    <th>Thứ tự</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesLoading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                        <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh mục...</div>
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        Chưa có danh mục nào. Hãy bấm "Tạo danh mục mới".
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 600, color: '#64748b' }}>#{cat.id}</td>
                        <td>
                          <div className="admin-cat-cell">
                            <div className="admin-cat-thumb">
                              {cat.imageUrl ? (
                                <img src={cat.imageUrl} alt={cat.name} />
                              ) : (
                                <FolderTree size={16} />
                              )}
                            </div>
                            <div className="admin-cat-title-wrap">
                              <div className="admin-cat-name">{cat.name}</div>
                              <div className="admin-cat-slug">/{cat.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {cat.parentName ? (
                            <span style={{ color: '#2563eb', fontWeight: 500 }}>{cat.parentName}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>— Danh mục gốc —</span>
                          )}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8125rem', maxWidth: '280px' }}>
                          {cat.description || 'Chưa có mô tả'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{cat.sortOrder ?? 0}</td>
                        <td>
                          <span className={`status-pill ${(cat.status || '').toLowerCase()}`}>
                            {cat.status === 'ACTIVE' ? '● Đang hiển thị' : '● Đã ẩn'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-table-actions" style={{ justifyContent: 'flex-end' }}>
                            {/* Xem sản phẩm thuộc danh mục (API 29) */}
                            <button
                              type="button"
                              className="admin-icon-btn primary"
                              title="Xem sản phẩm thuộc danh mục (API 29)"
                              onClick={() => handleOpenCategoryProducts(cat)}
                            >
                              <Package size={15} />
                            </button>

                            {/* Sửa danh mục (API 31) */}
                            <button
                              type="button"
                              className="admin-icon-btn"
                              title="Cập nhật danh mục (API 31)"
                              onClick={() => handleOpenEditCategory(cat)}
                            >
                              <Edit size={15} />
                            </button>

                            {/* Xóa danh mục (API 32) */}
                            <button
                              type="button"
                              className="admin-icon-btn danger"
                              title="Xóa / Ngừng sử dụng danh mục (API 32)"
                              onClick={() => handleOpenDeleteCategory(cat)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: QUẢN LÝ THƯƠNG HIỆU (BRANDS - STT 33-38) */}
        {/* =================================================================== */}
        {activeTab === 'brands' && isAdminUser && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#dc2626" />
                  Quản lý Thương hiệu Sản phẩm
                  <span className="admin-tab-badge" style={{ fontSize: '0.6875rem' }}>STT 33-38</span>
                </h2>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Tổng cộng <strong>{brands.length}</strong> thương hiệu đối tác công nghệ trên hệ thống Cyber.
                </span>
              </div>

              <div className="admin-toolbar-right">
                <select
                  value={brandStatusFilter}
                  onChange={(e) => setBrandStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Tạm ngừng (INACTIVE)</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenCreateBrand}
                  className="admin-btn-action primary"
                >
                  <Plus size={16} />
                  Thêm thương hiệu mới
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>ID</th>
                    <th style={{ width: '80px' }}>Logo</th>
                    <th>Tên thương hiệu</th>
                    <th>Slug URL</th>
                    <th>Mô tả</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Số sản phẩm</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Trạng thái</th>
                    <th style={{ textAlign: 'right', width: '160px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {brandsLoading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                        <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách thương hiệu...</div>
                      </td>
                    </tr>
                  ) : brands.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Không có thương hiệu nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    brands.map((brand) => (
                      <tr key={brand.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: '#64748b' }}>#{brand.id}</span>
                        </td>
                        <td>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#ffffff' }}>
                            {brand.logoUrl ? (
                              <img
                                src={brand.logoUrl}
                                alt={brand.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.85rem' }}>
                                {brand.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{brand.name}</div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.78125rem', color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            /{brand.slug}
                          </code>
                        </td>
                        <td>
                          <div style={{ maxWidth: '280px', color: '#64748b', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={brand.description}>
                            {brand.description || '— Chưa có mô tả —'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenBrandProducts(brand)}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Bấm để xem danh sách sản phẩm thuộc thương hiệu này"
                          >
                            {brand.productCount ?? 0} sản phẩm
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-pill ${(brand.status || 'ACTIVE').toLowerCase()}`}>
                            {brand.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenBrandProducts(brand)}
                              className="admin-btn-action light"
                              title="Xem sản phẩm"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditBrand(brand)}
                              className="admin-btn-action light"
                              title="Chỉnh sửa thông tin thương hiệu"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteBrand(brand)}
                              className="admin-btn-action danger"
                              title="Xóa hoặc ngừng sử dụng thương hiệu"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: QUYỀN HẠN CỦA TÔI (MY PERMISSIONS - STT 26) */}
        {/* =================================================================== */}
        {activeTab === 'permissions' && !isAdminUser && isShopManager && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Danh sách quyền của người dùng hiện tại (API 26: GET /auth/me/permissions)
                </h2>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Tài khoản <strong>@{user.username}</strong> ({user.email}) đang sở hữu <strong>{myPermissions.length}</strong> quyền hạn.
                </span>
              </div>
            </div>

            {myPermsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải quyền của bạn...</div>
              </div>
            ) : myPermissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                Tài khoản này chưa có quyền hạn nào được gán trực tiếp.
              </div>
            ) : (
              <div className="admin-my-perms-grid">
                {myPermissions.map((code) => (
                  <div key={code} className="admin-my-perm-card">
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span className="perm-code">{code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: ĐƠN HÀNG CỬA HÀNG (SHOP MANAGER) */}
        {/* =================================================================== */}
        {activeTab === 'orders' && !isAdminUser && isShopManager && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Huy hiệu shop */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 600, color: '#166534', fontSize: '0.85rem' }}>
                  <Store size={15} />
                  <span>🏪 Đơn hàng: <strong>{myShopInfo?.name || `Shop #${selectedShopId}`}</strong></span>
                </div>

                {/* Lọc trạng thái đơn */}
                <select
                  className="admin-select-filter"
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                  }}
                >
                  <option value="all">Tất cả trạng thái đơn</option>
                  <option value="PENDING">1. Chờ xác nhận (PENDING)</option>
                  <option value="CONFIRMED">2. Đã xác nhận (CONFIRMED)</option>
                  <option value="PROCESSING">3. Đang đóng gói (PROCESSING)</option>
                  <option value="SHIPPED">4. Đang vận chuyển (SHIPPED)</option>
                  <option value="DELIVERED">5. Giao thành công (DELIVERED)</option>
                  <option value="CANCELLED">0. Đã hủy (CANCELLED)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchAdminOrders(0)}
                  className="admin-btn-action-secondary"
                  title="Tìm & Lọc đơn hàng"
                >
                  <Search size={15} />
                  Lọc
                </button>
              </div>

              <div className="admin-toolbar-right">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{orderTotalElements}</strong> đơn hàng
                </span>
              </div>
            </div>

            {/* Orders Table */}
            {adminOrdersLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách đơn hàng...</div>
              </div>
            ) : adminOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                <ShoppingBag size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <div>Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.</div>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Mã đơn</th>
                      <th>Khách hàng & SĐT</th>
                      <th>Ngày đặt</th>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                      <th>Thanh toán</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>Thao tác & Chuyển trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOrders.map((ord) => {
                      const badge = getOrderStatusBadge(ord.status);
                      const isPending = ord.status === 'PENDING' || ord.status === 'pending';
                      const isConfirmed = ord.status === 'CONFIRMED' || ord.status === 'confirmed';
                      const isProcessing = ord.status === 'PROCESSING' || ord.status === 'processing';
                      const isShipped = ord.status === 'SHIPPED' || ord.status === 'shipped';
                      const isDelivered = ord.status === 'DELIVERED' || ord.status === 'delivered';
                      const isCancelled = ord.status === 'CANCELLED' || ord.status === 'cancelled';

                      return (
                        <tr key={ord.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>
                            #{ord.id}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {ord.shippingAddress?.fullName || 'Khách hàng'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {ord.shippingAddress?.phone || 'Chưa có SĐT'}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatAdminDate(ord.createdAt)}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.825rem', fontWeight: 500 }}>
                              {ord.items?.length || 0} món
                            </div>
                            {ord.items?.[0] && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ord.items[0].name}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {formatVND(ord.totalPayment || ord.subtotal || 0)}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {ord.paymentMethod || 'COD'}
                            </div>
                            <span 
                              style={{ 
                                fontSize: '0.6875rem', 
                                padding: '1px 6px', 
                                borderRadius: '4px',
                                background: ord.paymentStatus === 'PAID' ? '#ecfdf5' : '#fffbeb',
                                color: ord.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                                fontWeight: 600
                              }}
                            >
                              {ord.paymentStatus === 'PAID' ? 'Đã TT' : 'Chưa TT'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span 
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: badge.bg,
                                color: badge.color
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* Nút xem chi tiết đơn */}
                              <button
                                type="button"
                                className="admin-btn-action-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleViewAdminOrderDetail(ord)}
                                title="Xem chi tiết đơn hàng & Hóa đơn"
                              >
                                <Eye size={13} />
                                Chi tiết
                              </button>

                              {/* Hành động thông minh theo trạng thái */}
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    className="admin-btn-action-primary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#2563eb' }}
                                    onClick={() => setStatusChangeTarget({ order: ord, newStatus: 'CONFIRMED' })}
                                    title="Xác nhận đơn hàng"
                                  >
                                    Xác nhận
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-btn-action-danger"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => setStatusChangeTarget({ order: ord, newStatus: 'CANCELLED' })}
                                    title="Hủy đơn hàng"
                                  >
                                    Hủy
                                  </button>
                                </>
                              )}

                              {isConfirmed && (
                                <button
                                  type="button"
                                  className="admin-btn-action-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#7c3aed' }}
                                  onClick={() => setStatusChangeTarget({ order: ord, newStatus: 'PROCESSING' })}
                                  title="Chuyển sang bước Đóng gói"
                                >
                                  Đóng gói
                                </button>
                              )}

                              {isProcessing && (
                                <button
                                  type="button"
                                  className="admin-btn-action-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#d97706' }}
                                  onClick={() => setStatusChangeTarget({ order: ord, newStatus: 'SHIPPED' })}
                                  title="Giao cho đơn vị vận chuyển"
                                >
                                  Giao Shipper
                                </button>
                              )}

                              {isShipped && (
                                <button
                                  type="button"
                                  className="admin-btn-action-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#059669' }}
                                  onClick={() => setStatusChangeTarget({ order: ord, newStatus: 'DELIVERED', newPaymentStatus: 'PAID' })}
                                  title="Xác nhận giao thành công"
                                >
                                  Đã giao xong
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {orderTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={orderPage === 0}
                  onClick={() => fetchAdminOrders(orderPage - 1)}
                  className="admin-page-btn"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="admin-page-info">
                  Trang <strong>{orderPage + 1}</strong> / {orderTotalPages}
                </span>
                <button
                  type="button"
                  disabled={orderPage >= orderTotalPages - 1}
                  onClick={() => fetchAdminOrders(orderPage + 1)}
                  className="admin-page-btn"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 8: SẢN PHẨM CỬA HÀNG (SHOP MANAGER - STT 45-56) */}
        {/* =================================================================== */}
        {activeTab === 'shops' && !isAdminUser && isShopManager && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Thông tin Cửa hàng */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 600, color: '#166534', fontSize: '0.875rem' }}>
                  <Store size={16} />
                  <span>🏪 Cửa hàng: <strong>{myShopInfo?.name || (selectedShopId ? `Shop #${selectedShopId}` : 'Đang tải...')}</strong> {selectedShopId ? `(Mã shop: #${selectedShopId})` : ''}</span>
                </div>

                {/* Tìm kiếm */}
                <div className="admin-search-box">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên sản phẩm shop..."
                    value={shopProdKeyword}
                    onChange={(e) => setShopProdKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchShopProducts(0);
                    }}
                  />
                  {shopProdKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setShopProdKeyword('');
                        fetchShopProducts(0);
                      }}
                      className="admin-search-clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Lọc trạng thái */}
                <select
                  className="admin-select-filter"
                  value={shopProdStatusFilter}
                  onChange={(e) => setShopProdStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">ACTIVE (Đang kinh doanh)</option>
                  <option value="INACTIVE">INACTIVE (Tạm ngừng)</option>
                  <option value="DRAFT">DRAFT (Bản nháp)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchShopProducts(0)}
                  className="admin-btn-action-secondary"
                  title="Tìm kiếm"
                >
                  <Search size={15} />
                  Tìm
                </button>
              </div>

              <div className="admin-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  onClick={handleOpenCreateProduct}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 1rem' }}
                >
                  <Plus size={16} /> Thêm sản phẩm Shop
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{shopProdTotalElements}</strong> sản phẩm cửa hàng
                </span>
              </div>
            </div>

            {/* Shop Products Table */}
            {shopProductsLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách sản phẩm cửa hàng...</div>
              </div>
            ) : shopProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                <Box size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <div>Cửa hàng này chưa có sản phẩm nào phù hợp.</div>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th style={{ width: '70px' }}>Ảnh</th>
                      <th>Tên sản phẩm & Mã Slug</th>
                      <th>Danh mục & Hãng</th>
                      <th style={{ textAlign: 'right' }}>Giá bán</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>Trạng thái (STT 49)</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Quản lý chi tiết (STT 51-56)</th>
                      <th style={{ textAlign: 'right', width: '100px' }}>Xóa (STT 50)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopProducts.map((p) => {
                      const isActive = p.status === 'ACTIVE';
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>#{p.id}</td>
                          <td>
                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              <img
                                src={p.primaryImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80'}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80';
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>/{p.slug}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                              {p.category?.name || 'Chưa gán DM'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Hãng: {p.brand?.name || 'Cyber'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {formatVND(p.salePrice || p.price || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleShopProductStatus(p)}
                              className={`status-pill ${isActive ? 'active' : 'blocked'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                              title="Bấm để bật/tắt trạng thái sản phẩm"
                            >
                              {isActive ? '● Đang bán (ACTIVE)' : '○ Tạm ngừng (INACTIVE)'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="admin-btn-action-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleOpenEditProduct(p)}
                                title="STT 48: Chỉnh sửa thông tin chi tiết sản phẩm"
                              >
                                <Edit size={13} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="admin-btn-action-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleOpenVariantsModal(p)}
                                title="STT 51-53: Quản lý biến thể màu sắc, dung lượng, giá và tồn kho"
                              >
                                <SlidersHorizontal size={13} />
                                Biến thể ({p.variants?.length || 0})
                              </button>
                              <button
                                type="button"
                                className="admin-btn-action-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => handleOpenImagesModal(p)}
                                title="STT 54-56: Thư viện hình ảnh sản phẩm"
                              >
                                <Image size={13} />
                                Thư viện ảnh
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="admin-btn-action-danger"
                              style={{ padding: '5px 8px' }}
                              onClick={() => setShopProductToDelete(p)}
                              title="STT 50: Xóa sản phẩm khỏi cửa hàng"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {shopProdTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={shopProdPage === 0}
                  onClick={() => fetchShopProducts(shopProdPage - 1)}
                  className="admin-page-btn"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="admin-page-info">
                  Trang <strong>{shopProdPage + 1}</strong> / {shopProdTotalPages}
                </span>
                <button
                  type="button"
                  disabled={shopProdPage >= shopProdTotalPages - 1}
                  onClick={() => fetchShopProducts(shopProdPage + 1)}
                  className="admin-page-btn"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: QUẢN TRỊ CỬA HÀNG (ADMIN SHOPS - STT 67-69) */}
        {/* =================================================================== */}
        {activeTab === 'admin-shops' && isAdminUser && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Tìm kiếm cửa hàng */}
                <div className="admin-search-box">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên shop, chủ sở hữu, email..."
                    value={adminShopsKeyword}
                    onChange={(e) => setAdminShopsKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchAdminShops(0);
                    }}
                  />
                  {adminShopsKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminShopsKeyword('');
                        fetchAdminShops(0);
                      }}
                      className="admin-search-clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Lọc trạng thái cửa hàng */}
                <select
                  className="admin-select-filter"
                  value={adminShopsStatusFilter}
                  onChange={(e) => {
                    setAdminShopsStatusFilter(e.target.value);
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">PENDING (Chờ duyệt)</option>
                  <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                  <option value="SUSPENDED">SUSPENDED (Đình chỉ kinh doanh)</option>
                  <option value="REJECTED">REJECTED (Bị từ chối)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchAdminShops(0)}
                  className="admin-btn-action-secondary"
                  title="Tìm kiếm"
                >
                  <Search size={15} />
                  Tìm
                </button>
              </div>

              <div className="admin-toolbar-right">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{adminShopsTotalElements}</strong> cửa hàng
                </span>
              </div>
            </div>

            {/* Admin Shops Table */}
            {adminShopsLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách cửa hàng...</div>
              </div>
            ) : adminShops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                Không tìm thấy cửa hàng nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>Cửa hàng</th>
                      <th>Chủ cửa hàng</th>
                      <th>Liên hệ</th>
                      <th style={{ textAlign: 'center', width: '150px' }}>Trạng thái</th>
                      <th>Ngày đăng ký</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminShops.map((s) => {
                      const statusColor = 
                        s.status === 'ACTIVE' ? '#16a34a' :
                        s.status === 'PENDING' ? '#ca8a04' :
                        s.status === 'SUSPENDED' ? '#ea580c' : '#dc2626';
                      const statusBg =
                        s.status === 'ACTIVE' ? '#f0fdf4' :
                        s.status === 'PENDING' ? '#fefce8' :
                        s.status === 'SUSPENDED' ? '#fff7ed' : '#fef2f2';

                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 700, color: '#64748b' }}>#{s.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={s.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=80'}
                                alt={s.name}
                                style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=80';
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/{s.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.ownerName || 'Chưa cập nhật'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mã chủ shop: #{s.ownerId}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>{s.contactEmail || 'Chưa có email'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.contactPhone || 'Chưa có SĐT'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: statusBg,
                                color: statusColor,
                                border: `1px solid ${statusColor}33`
                              }}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {/* Xem chi tiết (STT 68) */}
                              <button
                                type="button"
                                className="admin-action-btn view"
                                onClick={() => handleViewAdminShopDetail(s.id)}
                                title="STT 68: Xem chi tiết cửa hàng"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Duyệt shop nếu đang PENDING */}
                              {s.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    className="admin-action-btn approve"
                                    onClick={() => handleOpenShopStatusModal(s, 'ACTIVE')}
                                    title="STT 69: Duyệt cửa hàng"
                                    style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}
                                  >
                                    <Check size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-action-btn reject"
                                    onClick={() => handleOpenShopStatusModal(s, 'REJECTED')}
                                    title="STT 69: Từ chối cửa hàng"
                                    style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}
                                  >
                                    <X size={15} />
                                  </button>
                                </>
                              )}

                              {/* Tạm ngừng shop nếu đang ACTIVE */}
                              {s.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  className="admin-action-btn lock"
                                  onClick={() => handleOpenShopStatusModal(s, 'SUSPENDED')}
                                  title="STT 69: Tạm ngừng / Đình chỉ hoạt động"
                                  style={{ color: '#ea580c', backgroundColor: '#fff7ed' }}
                                >
                                  <Lock size={15} />
                                </button>
                              )}

                              {/* Mở lại shop nếu đang SUSPENDED hoặc REJECTED */}
                              {(s.status === 'SUSPENDED' || s.status === 'REJECTED') && (
                                <button
                                  type="button"
                                  className="admin-action-btn unlock"
                                  onClick={() => handleOpenShopStatusModal(s, 'ACTIVE')}
                                  title="STT 69: Mở lại hoạt động kinh doanh"
                                  style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}
                                >
                                  <Unlock size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {adminShopsTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={adminShopsPage === 0}
                  onClick={() => fetchAdminShops(adminShopsPage - 1)}
                  className="admin-page-btn"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="admin-page-info">
                  Trang <strong>{adminShopsPage + 1}</strong> / {adminShopsTotalPages}
                </span>
                <button
                  type="button"
                  disabled={adminShopsPage >= adminShopsTotalPages - 1}
                  onClick={() => fetchAdminShops(adminShopsPage + 1)}
                  className="admin-page-btn"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: QUẢN LÝ MÃ GIẢM GIÁ (COUPONS - SHOP MANAGER) */}
        {/* =================================================================== */}
        {activeTab === 'coupons' && !isAdminUser && isShopManager && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Tìm kiếm */}
                <div className="admin-search-box">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã code, tên chương trình..."
                    value={couponKeyword}
                    onChange={(e) => setCouponKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchCoupons(0);
                    }}
                  />
                  {couponKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setCouponKeyword('');
                        fetchCoupons(0);
                      }}
                      className="admin-search-clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Lọc theo Cửa hàng */}
                <select
                  className="admin-select-filter"
                  value={couponShopFilter}
                  onChange={(e) => setCouponShopFilter(e.target.value)}
                >
                  <option value="">Tất cả Cửa hàng</option>
                  {adminShops.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} (#{sh.id})
                    </option>
                  ))}
                </select>

                {/* Lọc theo trạng thái */}
                <select
                  className="admin-select-filter"
                  value={couponStatusFilter}
                  onChange={(e) => setCouponStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                  <option value="DRAFT">DRAFT (Bản nháp)</option>
                  <option value="INACTIVE">INACTIVE (Đã tắt / Tạm dừng)</option>
                  <option value="EXPIRED">EXPIRED (Hết hạn)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchCoupons(0)}
                  className="admin-btn-action-secondary"
                  title="Tìm kiếm"
                >
                  <Search size={15} />
                  Tìm
                </button>
              </div>

              <div className="admin-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{couponTotalElements}</strong> mã giảm giá
                </span>
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  onClick={handleOpenCreateCoupon}
                >
                  <Plus size={16} /> Tạo Mã Giảm Giá
                </button>
              </div>
            </div>

            {/* Bảng danh sách mã giảm giá */}
            {couponsLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải danh sách mã giảm giá...</div>
              </div>
            ) : coupons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                <Ticket size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <div>Không tìm thấy mã giảm giá nào phù hợp.</div>
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  style={{ marginTop: '1rem', display: 'inline-flex' }}
                  onClick={handleOpenCreateCoupon}
                >
                  <Plus size={16} /> Tạo Mã Giảm Giá Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>Mã & Tên Ưu Đãi</th>
                      <th>Cửa hàng</th>
                      <th>Mức giảm</th>
                      <th>Điều kiện áp dụng</th>
                      <th>Lượt sử dụng</th>
                      <th>Thời hạn hiệu lực</th>
                      <th style={{ textAlign: 'center', width: '130px' }}>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: '150px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => {
                      const isExpired = new Date(c.endAt) < new Date();
                      const statusColor =
                        c.status === 'ACTIVE' && !isExpired ? '#16a34a' :
                        c.status === 'DRAFT' ? '#64748b' :
                        c.status === 'INACTIVE' ? '#ea580c' : '#dc2626';
                      const statusBg =
                        c.status === 'ACTIVE' && !isExpired ? '#f0fdf4' :
                        c.status === 'DRAFT' ? '#f1f5f9' :
                        c.status === 'INACTIVE' ? '#fff7ed' : '#fef2f2';

                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 700, color: '#64748b' }}>#{c.id}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  className="coupon-code-badge"
                                  onClick={() => handleCopyCouponCode(c.code)}
                                  title="Nhấn để sao chép mã"
                                >
                                  {c.code}
                                  {copiedCouponCode === c.code ? (
                                    <Check size={12} style={{ color: '#16a34a' }} />
                                  ) : (
                                    <Copy size={12} style={{ opacity: 0.6 }} />
                                  )}
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                              {c.description && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {c.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{c.shopName || `Shop #${c.shopId}`}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mã shop: #{c.shopId}</div>
                          </td>
                          <td>
                            <span className="coupon-discount-tag">
                              {c.discountType === 'PERCENTAGE' ? (
                                <>
                                  <Percent size={13} /> {c.discountValue}%
                                  {c.maxDiscountAmount && (
                                    <span style={{ fontSize: '0.7rem', color: '#047857', opacity: 0.85 }}>
                                      (tối đa {formatVND(c.maxDiscountAmount)})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>Giảm {formatVND(c.discountValue)}</>
                              )}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            <div>Đơn tối thiểu: <strong>{c.minOrderAmount ? formatVND(c.minOrderAmount) : '0đ'}</strong></div>
                            {c.perUserLimit && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Tối đa <strong>{c.perUserLimit}</strong> lần/khách
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            <div>
                              <strong>{c.usageCount || 0}</strong>
                              <span style={{ color: '#64748b' }}> / {c.usageLimit ? `${c.usageLimit} lượt` : 'Không giới hạn'}</span>
                            </div>
                            {c.usageLimit && (
                              <div style={{ width: '80px', height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    background: (c.usageCount / c.usageLimit) >= 1 ? '#dc2626' : '#10b981',
                                    width: `${Math.min(100, Math.round(((c.usageCount || 0) / c.usageLimit) * 100))}%`
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                            <div>Từ: <strong>{c.startAt ? new Date(c.startAt).toLocaleDateString('vi-VN') : '—'}</strong></div>
                            <div>Đến: <strong>{c.endAt ? new Date(c.endAt).toLocaleDateString('vi-VN') : '—'}</strong></div>
                            {isExpired && (
                              <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.7rem' }}>
                                (Đã hết hạn)
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: statusBg,
                                color: statusColor,
                                border: `1px solid ${statusColor}33`
                              }}
                            >
                              {isExpired ? 'EXPIRED' : c.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {/* Sửa mã */}
                              <button
                                type="button"
                                className="admin-action-btn edit"
                                onClick={() => handleOpenEditCoupon(c)}
                                title="Chỉnh sửa mã giảm giá"
                              >
                                <Edit size={15} />
                              </button>

                              {/* Bật / Tắt trạng thái */}
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => handleToggleCouponStatus(c)}
                                title={c.status === 'ACTIVE' ? 'Tạm dừng mã giảm giá' : 'Kích hoạt mã giảm giá'}
                                style={{
                                  color: c.status === 'ACTIVE' ? '#ea580c' : '#16a34a',
                                  backgroundColor: c.status === 'ACTIVE' ? '#fff7ed' : '#f0fdf4'
                                }}
                              >
                                {c.status === 'ACTIVE' ? <Lock size={15} /> : <Unlock size={15} />}
                              </button>

                              {/* Xóa mã */}
                              <button
                                type="button"
                                className="admin-action-btn delete"
                                onClick={() => {
                                  setTargetCouponForDelete(c);
                                  setShowDeleteCouponModal(true);
                                }}
                                title="Xóa mã giảm giá"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination cho Coupons */}
            {couponTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={couponPage === 0}
                  onClick={() => fetchCoupons(couponPage - 1)}
                  className="admin-page-btn"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="admin-page-info">
                  Trang <strong>{couponPage + 1}</strong> / {couponTotalPages}
                </span>
                <button
                  type="button"
                  disabled={couponPage >= couponTotalPages - 1}
                  onClick={() => fetchCoupons(couponPage + 1)}
                  className="admin-page-btn"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB: QUẢN LÝ TỒN KHO CỬA HÀNG (INVENTORY - SHOP MANAGER) */}
        {/* =================================================================== */}
        {activeTab === 'inventory' && !isAdminUser && isShopManager && (
          <div className="admin-card-container">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                {/* Thông tin Cửa hàng */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 600, color: '#166534', fontSize: '0.875rem' }}>
                  <Store size={16} />
                  <span>Kho hàng: <strong>{myShopInfo?.name || (selectedShopId ? `Shop #${selectedShopId}` : 'Đang tải...')}</strong></span>
                </div>

                {/* Tìm kiếm biến thể */}
                <div className="admin-search-box">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm theo SKU, tên sản phẩm..."
                    value={inventoryKeyword}
                    onChange={(e) => setInventoryKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchInventory(0);
                    }}
                  />
                  {inventoryKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryKeyword('');
                        fetchInventory(0);
                      }}
                      className="admin-search-clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Toggle sản phẩm sắp hết hàng (STT 73) */}
                <button
                  type="button"
                  onClick={() => setIsLowStockOnly(!isLowStockOnly)}
                  className={`admin-btn-action-secondary ${isLowStockOnly ? 'active' : ''}`}
                  style={{
                    backgroundColor: isLowStockOnly ? '#fef2f2' : undefined,
                    borderColor: isLowStockOnly ? '#f87171' : undefined,
                    color: isLowStockOnly ? '#dc2626' : undefined,
                    fontWeight: isLowStockOnly ? 700 : undefined
                  }}
                  title="STT 73: Lọc sản phẩm sắp hết hàng"
                >
                  <TrendingDown size={15} />
                  Sắp hết hàng ({lowStockThreshold})
                </button>

                <button
                  type="button"
                  onClick={() => fetchInventory(0)}
                  className="admin-btn-action-secondary"
                  title="Tìm kiếm"
                >
                  <Search size={15} />
                  Tìm
                </button>
              </div>

              <div className="admin-toolbar-right">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Tổng cộng: <strong>{inventoryTotalElements}</strong> phiên bản tồn kho
                </span>
              </div>
            </div>

            {/* Inventory Table */}
            {inventoryLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b' }}>Đang tải dữ liệu tồn kho...</div>
              </div>
            ) : inventoryList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b' }}>
                Chưa có dữ liệu tồn kho cho cửa hàng này.
              </div>
            ) : (
              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>ID Kho</th>
                      <th>Mã SKU</th>
                      <th>Phiên bản / Sản phẩm</th>
                      <th>Màu sắc</th>
                      <th>Dung lượng</th>
                      <th>Giá bán</th>
                      <th style={{ textAlign: 'center', width: '130px' }}>Tồn kho</th>
                      <th style={{ textAlign: 'center', width: '140px' }}>Tình trạng</th>
                      <th style={{ textAlign: 'center', width: '160px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList.map((item) => {
                      const qty = Number(item.quantity ?? 0);
                      const isLow = qty <= lowStockThreshold;
                      const isOut = qty <= 0;

                      return (
                        <tr key={item.inventoryId || item.variantId}>
                          <td style={{ fontWeight: 700, color: '#64748b' }}>#{item.inventoryId}</td>
                          <td>
                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {item.sku || 'CHƯA CÓ'}
                            </code>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.productName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.variantName}</div>
                          </td>
                          <td>{item.color || '—'}</td>
                          <td>{item.storage || '—'}</td>
                          <td style={{ fontWeight: 600, color: '#dc2626' }}>
                            {item.price ? formatVND(item.price) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: isOut ? '#dc2626' : isLow ? '#ea580c' : '#16a34a' }}>
                            {qty}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: isOut ? '#fef2f2' : isLow ? '#fff7ed' : '#f0fdf4',
                                color: isOut ? '#dc2626' : isLow ? '#ea580c' : '#16a34a',
                                border: `1px solid ${isOut ? '#dc2626' : isLow ? '#ea580c' : '#16a34a'}33`
                              }}
                            >
                              {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Đầy đủ'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="admin-btn-action-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleOpenAdjustModal(item)}
                              title="STT 72: Điều chỉnh tồn kho"
                            >
                              <SlidersHorizontal size={13} />
                              Điều chỉnh
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!isLowStockOnly && inventoryTotalPages > 1 && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={inventoryPage === 0}
                  onClick={() => fetchInventory(inventoryPage - 1)}
                  className="admin-page-btn"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="admin-page-info">
                  Trang <strong>{inventoryPage + 1}</strong> / {inventoryTotalPages}
                </span>
                <button
                  type="button"
                  disabled={inventoryPage >= inventoryTotalPages - 1}
                  onClick={() => fetchInventory(inventoryPage + 1)}
                  className="admin-page-btn"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Chi tiết người dùng #${selectedUserDetail?.id || ''}`}
          type="info"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsDetailModalOpen(false)}
        >
          {selectedUserDetail && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <img
                  src={selectedUserDetail.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}
                  alt={selectedUserDetail.username}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedUserDetail.fullName || selectedUserDetail.username}
                  </h4>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>@{selectedUserDetail.username}</div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <span className={`status-pill ${(selectedUserDetail.status || '').toLowerCase()}`}>
                      {selectedUserDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Email:</strong>
                  <span>{selectedUserDetail.email}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Số điện thoại:</strong>
                  <span>{selectedUserDetail.phone || 'Chưa cung cấp'}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Xác minh Email:</strong>
                  <span>{selectedUserDetail.emailVerifiedAt ? `Đã xác minh (${new Date(selectedUserDetail.emailVerifiedAt).toLocaleString('vi-VN')})` : 'Chưa xác minh'}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Đăng nhập gần nhất:</strong>
                  <span>{selectedUserDetail.lastLoginAt ? new Date(selectedUserDetail.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.4rem' }}>Tập vai trò hệ thống:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(selectedUserDetail.roles || []).map((r) => (
                    <span key={r.code} className="role-pill admin">
                      {r.name} ({r.code})
                    </span>
                  ))}
                </div>
              </div>

              {selectedUserDetail.addresses && selectedUserDetail.addresses.length > 0 && (
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.4rem' }}>Sổ địa chỉ nhận hàng ({selectedUserDetail.addresses.length}):</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedUserDetail.addresses.map((addr) => (
                      <div key={addr.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
                        <strong>{addr.recipientName}</strong> ({addr.phone}) {addr.isDefault && <span style={{ color: '#16a34a', fontWeight: 700 }}>[MẶC ĐỊNH]</span>}
                        <div>{addr.addressDetail}, {addr.ward}, {addr.district}, {addr.province}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 2: SỬA THÔNG TIN QUẢN TRỊ (API 14) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isEditUserModalOpen}
          onClose={() => setIsEditUserModalOpen(false)}
          title={`Sửa thông tin tài khoản #${editingUser?.id}`}
          type="confirm"
          confirmText={isSavingUser ? 'Đang lưu...' : 'Lưu thay đổi'}
          cancelText="Hủy"
          onConfirm={handleSaveEditUser}
        >
          {editingUser && (
            <form onSubmit={handleSaveEditUser} className="admin-modal-form">
              <div className="admin-form-group">
                <label>Tên đăng nhập (Username):</label>
                <input type="text" value={editingUser.username} disabled style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                <span className="admin-form-hint">Username là thuộc tính nhận diện cốt lõi, không được phép thay đổi.</span>
              </div>

              <div className="admin-form-group">
                <label>Họ và tên hiển thị:</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={editUserData.fullName}
                  onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Số điện thoại:</label>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Đường dẫn ảnh đại diện (Avatar URL):</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editUserData.avatarUrl}
                  onChange={(e) => setEditUserData({ ...editUserData, avatarUrl: e.target.value })}
                />
              </div>
            </form>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 3: GÁN / THAY ĐỔI VAI TRÒ HỆ THỐNG (API 16 & 17) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isRoleAssignModalOpen}
          onClose={() => setIsRoleAssignModalOpen(false)}
          title={`Gán vai trò cho: ${roleAssignUser?.username}`}
          type="confirm"
          confirmText={isSavingRoles ? 'Đang lưu...' : 'Cập nhật vai trò'}
          cancelText="Hủy"
          onConfirm={handleSaveUserRoles}
        >
          {roleAssignUser && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem' }}>
              <div style={{ marginBottom: '1rem', color: '#64748b' }}>
                Chọn các vai trò hệ thống hoặc tùy chỉnh muốn gán cho tài khoản này. Hệ thống có cơ chế <strong>Anti-Lockout</strong> tự động ngăn chặn việc gỡ bỏ vai trò của tài khoản ADMIN cuối cùng.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {roles.map((r) => {
                  const isShopManagerRole = r.code === 'SHOP_MANAGER' || r.code === 'ROLE_SHOP_MANAGER';
                  const userOwnsShop = Boolean(
                    roleAssignUser?.ownsShop ||
                    adminShops.some((s) => s.ownerId === roleAssignUser?.id && s.status !== 'REJECTED')
                  );
                  const isShopManagerLocked = isShopManagerRole && userOwnsShop;
                  const isChecked = isShopManagerLocked ? true : selectedRoleCodes.includes(r.code);

                  return (
                    <label
                      key={r.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.8rem',
                        background: isChecked ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        cursor: isShopManagerLocked ? 'not-allowed' : 'pointer',
                        opacity: isShopManagerLocked ? 0.95 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isShopManagerLocked}
                        onChange={(e) => {
                          if (isShopManagerLocked) return;
                          if (e.target.checked) {
                            setSelectedRoleCodes([...selectedRoleCodes, r.code]);
                          } else {
                            setSelectedRoleCodes(selectedRoleCodes.filter((c) => c !== r.code));
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {r.name} <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>({r.code})</span>
                          </div>
                          {isShopManagerLocked && (
                            <span style={{
                              fontSize: '0.71875rem',
                              fontWeight: 700,
                              color: '#059669',
                              background: '#ecfdf5',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              border: '1px solid #a7f3d0'
                            }}>
                              🔒 Đang sở hữu shop (Không thể xóa)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {isShopManagerLocked
                            ? `Người dùng đang sở hữu cửa hàng (${roleAssignUser?.ownedShopName || 'Shop chính thức'}). Hệ thống bảo vệ không cho phép xóa quyền Quản lý shop.`
                            : (r.description || 'Vai trò hệ thống')}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 4: KHÓA / MỞ KHÓA TÀI KHOẢN (API 15) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={targetNewStatus === 'BLOCKED' ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản người dùng'}
          type={targetNewStatus === 'BLOCKED' ? 'danger' : 'success'}
          confirmText={isSavingStatus ? 'Đang xử lý...' : (targetNewStatus === 'BLOCKED' ? 'Xác nhận Khóa' : 'Xác nhận Mở khóa')}
          cancelText="Hủy"
          onConfirm={handleConfirmStatusChange}
          message={
            targetNewStatus === 'BLOCKED'
              ? `Bạn có chắc chắn muốn KHÓA tài khoản "${statusTargetUser?.username}"? Tài khoản này sẽ không thể đăng nhập vào hệ thống.`
              : `Bạn có muốn MỞ KHÓA và khôi phục trạng thái hoạt động cho tài khoản "${statusTargetUser?.username}"?`
          }
        />

        {/* =================================================================== */}
        {/* MODAL 5: TẠO VAI TRÒ MỚI (API 20) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isCreateRoleModalOpen}
          onClose={() => setIsCreateRoleModalOpen(false)}
          title="Tạo vai trò mới trong hệ thống (API 20)"
          type="confirm"
          confirmText={isSavingNewRole ? 'Đang tạo...' : 'Tạo vai trò'}
          cancelText="Hủy"
          onConfirm={handleSaveNewRole}
        >
          <form onSubmit={handleSaveNewRole} className="admin-modal-form">
            <div className="admin-form-group">
              <label>Mã vai trò (Role Code): *</label>
              <input
                type="text"
                placeholder="VD: ROLE_MARKETING, ROLE_SUPPORT..."
                value={newRoleData.code}
                onChange={(e) => setNewRoleData({ ...newRoleData, code: e.target.value.toUpperCase() })}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              />
              <span className="admin-form-hint">Mã vai trò viết hoa không dấu, bắt đầu bằng ROLE_</span>
            </div>

            <div className="admin-form-group">
              <label>Tên vai trò hiển thị: *</label>
              <input
                type="text"
                placeholder="VD: Nhân viên Marketing, Hỗ trợ khách hàng..."
                value={newRoleData.name}
                onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label>Mô tả vai trò:</label>
              <textarea
                placeholder="Mô tả phạm vi trách nhiệm của vai trò..."
                value={newRoleData.description}
                onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
              />
            </div>
          </form>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 6: SỬA VAI TRÒ (API 21) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isEditRoleModalOpen}
          onClose={() => setIsEditRoleModalOpen(false)}
          title={`Cập nhật vai trò [${editingRole?.code}]`}
          type="confirm"
          confirmText={isSavingEditRole ? 'Đang lưu...' : 'Lưu thay đổi'}
          cancelText="Hủy"
          onConfirm={handleSaveEditRole}
        >
          {editingRole && (
            <form onSubmit={handleSaveEditRole} className="admin-modal-form">
              <div className="admin-form-group">
                <label>Mã vai trò:</label>
                <input type="text" value={editingRole.code} disabled style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                <span className="admin-form-hint">Mã vai trò không thể thay đổi để đảm bảo tính toàn vẹn hệ thống.</span>
              </div>

              <div className="admin-form-group">
                <label>Tên hiển thị:</label>
                <input
                  type="text"
                  value={editRoleData.name}
                  onChange={(e) => setEditRoleData({ ...editRoleData, name: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Mô tả:</label>
                <textarea
                  value={editRoleData.description}
                  onChange={(e) => setEditRoleData({ ...editRoleData, description: e.target.value })}
                />
              </div>
            </form>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 7: GÁN QUYỀN CHO VAI TRÒ (API 24 & 25) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isAssignPermModalOpen}
          onClose={() => setIsAssignPermModalOpen(false)}
          title={`Phân quyền cho vai trò: ${assignRoleTarget?.name} (${roleSelectedPerms.length} quyền)`}
          type="confirm"
          maxWidth="720px"
          confirmText={isSavingPerms ? 'Đang lưu...' : 'Cập nhật danh sách quyền'}
          cancelText="Hủy"
          onConfirm={handleSaveRolePermissions}
        >
          {assignRoleTarget && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className="admin-search-box" style={{ maxWidth: '280px' }}>
                  <Search size={15} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm quyền theo mã..."
                    value={permSearchKeyword}
                    onChange={(e) => setPermSearchKeyword(e.target.value)}
                  />
                  {permSearchKeyword && (
                    <button type="button" onClick={() => setPermSearchKeyword('')} className="admin-search-clear">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="admin-page-btn"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => {
                      setRoleSelectedPerms(allPermissions.map((p) => p.code));
                    }}
                  >
                    Chọn tất cả ({allPermissions.length})
                  </button>
                  <button
                    type="button"
                    className="admin-page-btn"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => setRoleSelectedPerms([])}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {Object.keys(groupedPermissions).map((moduleKey) => (
                  <div key={moduleKey} className="admin-perm-group">
                    <div className="admin-perm-group-header">
                      <span>Mô-đun: {moduleKey}</span>
                      <span style={{ fontSize: '0.71875rem', color: '#64748b' }}>
                        {groupedPermissions[moduleKey].length} quyền
                      </span>
                    </div>

                    <div className="admin-perm-checkbox-grid">
                      {groupedPermissions[moduleKey].map((p) => {
                        const isChecked = roleSelectedPerms.includes(p.code);
                        return (
                          <label key={p.code} className="admin-perm-checkbox-item">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRoleSelectedPerms([...roleSelectedPerms, p.code]);
                                } else {
                                  setRoleSelectedPerms(roleSelectedPerms.filter((c) => c !== p.code));
                                }
                              }}
                            />
                            <div>
                              <span className="admin-perm-code">{p.code}</span>
                              <span className="admin-perm-desc">{p.name || p.description}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 8: XÓA VAI TRÒ TÙY CHỈNH (API 22) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isDeleteRoleModalOpen}
          onClose={() => setIsDeleteRoleModalOpen(false)}
          title="Xóa vai trò tùy chỉnh"
          type="danger"
          confirmText={isDeletingRole ? 'Đang xóa...' : 'Xác nhận xóa'}
          cancelText="Hủy"
          onConfirm={handleConfirmDeleteRole}
          message={`Bạn có chắc chắn muốn xóa vai trò tùy chỉnh "${roleToDelete?.name}" (${roleToDelete?.code})? Hành động này không thể hoàn tác.`}
        />

        {/* =================================================================== */}
        {/* MODAL 9: TẠO / SỬA DANH MỤC SẢN PHẨM (API 30 & 31) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title={isEditingCategory ? `Cập nhật danh mục: ${categoryFormData.name}` : 'Tạo danh mục sản phẩm mới (API 30)'}
          type="confirm"
          confirmText={isSavingCategory ? 'Đang lưu...' : (isEditingCategory ? 'Lưu thay đổi' : 'Tạo danh mục')}
          cancelText="Hủy"
          onConfirm={handleSaveCategory}
        >
          <form onSubmit={handleSaveCategory} className="admin-modal-form">
            <div className="admin-form-group">
              <label>Tên danh mục: *</label>
              <input
                type="text"
                placeholder="VD: Điện thoại & Tablet, Laptop, Đồng hồ..."
                value={categoryFormData.name}
                onChange={handleCategoryNameChange}
              />
            </div>

            <div className="admin-form-group">
              <label>Slug (Đường dẫn tĩnh chuẩn SEO): *</label>
              <input
                type="text"
                placeholder="dien-thoai-tablet"
                value={categoryFormData.slug}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value.toLowerCase() })}
              />
              <span className="admin-form-hint">Tự động gợi ý từ tên danh mục tiếng Việt không dấu.</span>
            </div>

            <div className="admin-form-group">
              <label>Danh mục cha (Tùy chọn):</label>
              <select
                value={categoryFormData.parentId}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, parentId: e.target.value })}
              >
                <option value="">— Không có (Đây là danh mục gốc) —</option>
                {categories
                  .filter((c) => !isEditingCategory || c.id !== currentCatId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: #{c.id})
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="admin-form-group">
                <label>Thứ tự hiển thị:</label>
                <input
                  type="number"
                  value={categoryFormData.sortOrder}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, sortOrder: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Trạng thái hiển thị:</label>
                <select
                  value={categoryFormData.status}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, status: e.target.value })}
                >
                  <option value="ACTIVE">Hiển thị ngoài Catalog (ACTIVE)</option>
                  <option value="INACTIVE">Tạm ẩn (INACTIVE)</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label>Ảnh đại diện / Icon URL:</label>
              <input
                type="text"
                placeholder="https://..."
                value={categoryFormData.imageUrl}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, imageUrl: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label>Mô tả danh mục:</label>
              <textarea
                placeholder="Mô tả về các mặt hàng thuộc danh mục..."
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              />
            </div>
          </form>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 10: XÓA / NGỪNG SỬ DỤNG DANH MỤC (API 32) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isDeleteCatModalOpen}
          onClose={() => setIsDeleteCatModalOpen(false)}
          title={`Xóa danh mục: ${categoryToDelete?.name}`}
          type="danger"
          confirmText={isDeletingCategory ? 'Đang xử lý...' : 'Xác nhận'}
          cancelText="Hủy"
          onConfirm={handleConfirmDeleteCategory}
        >
          {categoryToDelete && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem' }}>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Bạn có chắc chắn muốn xóa danh mục <strong>"{categoryToDelete.name}"</strong>?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#b45309', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={16} />
                  Chính sách bảo vệ dữ liệu sản phẩm
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                  Nếu danh mục này đang chứa các sản phẩm liên kết, hệ thống sẽ từ chối xóa cứng để tránh mồ côi dữ liệu sản phẩm. Bạn có thể chọn tùy chọn <strong>Chuyển sang ngừng sử dụng (Xóa mềm)</strong> bên dưới.
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={forceDeleteCat}
                  onChange={(e) => setForceDeleteCat(e.target.checked)}
                />
                Tự động chuyển sang ngừng sử dụng (force=true) nếu còn sản phẩm
              </label>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 11: XEM SẢN PHẨM THUỘC DANH MỤC (API 29) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isProductsModalOpen}
          onClose={() => setIsProductsModalOpen(false)}
          title={`Sản phẩm thuộc danh mục: ${viewingCatProducts?.name || ''}`}
          type="info"
          maxWidth="680px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsProductsModalOpen(false)}
        >
          <div style={{ textAlign: 'left', maxHeight: '350px', overflowY: 'auto' }}>
            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>Đang tải danh sách sản phẩm...</div>
              </div>
            ) : categoryProductsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.84375rem' }}>
                Chưa có sản phẩm nào thuộc danh mục này ngoài catalog công khai.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categoryProductsList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.8rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Package size={18} color="#64748b" />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.71875rem', color: '#64748b' }}>Mã: #{p.id} • Slug: /{p.slug}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.8125rem' }}>
                        {p.minPrice ? Number(p.minPrice).toLocaleString('vi-VN') + ' đ' : 'Liên hệ'}
                      </div>
                      <span className="status-pill active" style={{ fontSize: '0.65625rem' }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 12: TẠO / SỬA THƯƠNG HIỆU (API 36 & 37) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          title={isEditingBrand ? `Cập nhật thương hiệu: ${brandFormData.name}` : 'Tạo thương hiệu mới (API 36)'}
          type="confirm"
          confirmText={isSavingBrand ? 'Đang lưu...' : (isEditingBrand ? 'Lưu thay đổi' : 'Tạo thương hiệu')}
          cancelText="Hủy"
          onConfirm={handleSaveBrand}
        >
          <form onSubmit={handleSaveBrand} className="admin-modal-form">
            <div className="admin-form-group">
              <label>Tên thương hiệu: *</label>
              <input
                type="text"
                placeholder="VD: Apple, Samsung, Sony, Dell, Asus..."
                value={brandFormData.name}
                onChange={(e) => handleBrandNameChange(e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label>Slug URL (Chuẩn SEO): *</label>
              <input
                type="text"
                placeholder="apple"
                value={brandFormData.slug}
                onChange={(e) => setBrandFormData({ ...brandFormData, slug: e.target.value.toLowerCase() })}
              />
              <span className="admin-form-hint">Tự động gợi ý từ tên thương hiệu không dấu.</span>
            </div>

            <div className="admin-form-group">
              <label>Logo URL:</label>
              <input
                type="text"
                placeholder="https://upload.wikimedia.org/.../logo.svg"
                value={brandFormData.logoUrl}
                onChange={(e) => setBrandFormData({ ...brandFormData, logoUrl: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label>Trạng thái thương hiệu:</label>
              <select
                value={brandFormData.status}
                onChange={(e) => setBrandFormData({ ...brandFormData, status: e.target.value })}
              >
                <option value="ACTIVE">Hoạt động ngoài Catalog (ACTIVE)</option>
                <option value="INACTIVE">Tạm ẩn / Ngừng kinh doanh (INACTIVE)</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label>Mô tả thương hiệu:</label>
              <textarea
                placeholder="Mô tả về lịch sử, sứ mệnh hoặc dải sản phẩm của hãng..."
                value={brandFormData.description}
                onChange={(e) => setBrandFormData({ ...brandFormData, description: e.target.value })}
              />
            </div>
          </form>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 13: XÓA / NGỪNG SỬ DỤNG THƯƠNG HIỆU (API 38) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isDeleteBrandModalOpen}
          onClose={() => setIsDeleteBrandModalOpen(false)}
          title={`Xóa thương hiệu: ${brandToDelete?.name}`}
          type="danger"
          confirmText={isDeletingBrand ? 'Đang xử lý...' : 'Xác nhận'}
          cancelText="Hủy"
          onConfirm={handleConfirmDeleteBrand}
        >
          {brandToDelete && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem' }}>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Bạn có chắc chắn muốn xóa thương hiệu <strong>"{brandToDelete.name}"</strong>?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#b45309', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={16} />
                  Chính sách bảo vệ dữ liệu sản phẩm
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                  Nếu thương hiệu này đang có <strong>{brandToDelete.productCount ?? 0}</strong> sản phẩm liên kết, hệ thống sẽ tự động chuyển trạng thái sang <strong>INACTIVE (ngừng kinh doanh)</strong> để bảo toàn toàn vẹn dữ liệu đơn hàng và sản phẩm.
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={forceDeleteBrand}
                  onChange={(e) => setForceDeleteBrand(e.target.checked)}
                />
                Xóa vĩnh viễn khỏi cơ sở dữ liệu nếu không có sản phẩm liên kết (force=true)
              </label>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 14: XEM SẢN PHẨM THUỘC THƯƠNG HIỆU (API 35) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isBrandProductsModalOpen}
          onClose={() => setIsBrandProductsModalOpen(false)}
          title={`Sản phẩm thuộc thương hiệu: ${viewingBrandProducts?.name || ''}`}
          type="info"
          maxWidth="680px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsBrandProductsModalOpen(false)}
        >
          <div style={{ textAlign: 'left', maxHeight: '350px', overflowY: 'auto' }}>
            {brandProductsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto', color: '#64748b' }} />
                <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>Đang tải danh sách sản phẩm...</div>
              </div>
            ) : brandProductsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.84375rem' }}>
                Chưa có sản phẩm nào thuộc thương hiệu này ngoài catalog công khai.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {brandProductsList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.8rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Package size={18} color="#64748b" />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.71875rem', color: '#64748b' }}>Mã: #{p.id} • Danh mục: {p.categoryName || 'Chung'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.8125rem' }}>
                        {p.minPrice ? Number(p.minPrice).toLocaleString('vi-VN') + ' đ' : 'Liên hệ'}
                      </div>
                      <span className="status-pill active" style={{ fontSize: '0.65625rem' }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 15: TẠO / SỬA SẢN PHẨM & BIẾN THỂ (CREATE / EDIT PRODUCT) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={isEditingProduct ? `Cập nhật sản phẩm: ${productFormData.name}` : 'Thêm sản phẩm mới kèm nhiều phiên bản'}
          type="confirm"
          maxWidth="940px"
          confirmText={isSavingProduct ? 'Đang lưu...' : (isEditingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm')}
          cancelText="Hủy"
          onConfirm={handleSaveProduct}
        >
          <form onSubmit={handleSaveProduct} className="admin-modal-form" style={{ textAlign: 'left' }}>
            {/* THÔNG TIN CƠ BẢN */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Package size={17} color="#2563eb" />
                1. Thông tin chung về sản phẩm
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="admin-form-group">
                  <label>Tên sản phẩm: *</label>
                  <input
                    type="text"
                    placeholder="VD: iPhone 16 Pro Max, MacBook Pro M3..."
                    value={productFormData.name}
                    onChange={(e) => handleProductNameChange(e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Slug URL (Đường dẫn chuẩn SEO): *</label>
                  <input
                    type="text"
                    placeholder="iphone-16-pro-max"
                    value={productFormData.slug}
                    onChange={(e) => setProductFormData({ ...productFormData, slug: e.target.value.toLowerCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="admin-form-group">
                  <label>Danh mục: *</label>
                  <select
                    value={productFormData.categoryId}
                    onChange={(e) => setProductFormData({ ...productFormData, categoryId: e.target.value })}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Thương hiệu:</label>
                  <select
                    value={productFormData.brandId}
                    onChange={(e) => setProductFormData({ ...productFormData, brandId: e.target.value })}
                  >
                    <option value="">-- Không có / Khác --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Bảo hành (tháng):</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={productFormData.warrantyMonths}
                    onChange={(e) => setProductFormData({ ...productFormData, warrantyMonths: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label>Trạng thái bán:</label>
                  <select
                    value={productFormData.status}
                    onChange={(e) => setProductFormData({ ...productFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang mở bán (ACTIVE)</option>
                    <option value="DRAFT">Bản nháp lưu tạm (DRAFT)</option>
                    <option value="INACTIVE">Tạm ngừng bán (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '0.75rem' }}>
                <label>Mô tả tóm tắt nổi bật:</label>
                <input
                  type="text"
                  placeholder="VD: Chip A18 Pro 3nm cực mạnh, Camera 48MP zoom quang 5x..."
                  value={productFormData.shortDescription}
                  onChange={(e) => setProductFormData({ ...productFormData, shortDescription: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label>Mô tả chi tiết sản phẩm:</label>
                <textarea
                  rows="3"
                  placeholder="Thông số kỹ thuật, bảo hành chính hãng, phụ kiện đi kèm..."
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                />
              </div>
            </div>

            {/* QUẢN LÝ HÌNH ẢNH */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <Image size={17} color="#2563eb" />
                  2. Hình ảnh sản phẩm ({productFormData.images.length} ảnh)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="file"
                    id="admin-product-file-input"
                    multiple
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="admin-product-file-input"
                    className="admin-btn-action-primary"
                    style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.78125rem' }}
                  >
                    <Upload size={14} />
                    {isUploadingImage ? 'Đang xử lý ảnh...' : 'Tải ảnh từ máy tính'}
                  </label>
                </div>
              </div>

              {/* Direct image URL input fallback */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Hoặc dán trực tiếp liên kết ảnh URL (https://...)..."
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomImageUrl}
                  className="admin-btn-action-secondary"
                  style={{ fontSize: '0.78125rem', padding: '0.45rem 0.75rem' }}
                >
                  <Plus size={14} /> Thêm ảnh
                </button>
              </div>

              {/* Images preview gallery */}
              {productFormData.images.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.8125rem' }}>
                  Chưa có hình ảnh nào. Bấm "Tải ảnh từ máy tính" hoặc dán URL để thêm hình ảnh cho sản phẩm.
                </div>
              ) : (
                <div className="admin-prod-images-grid">
                  {productFormData.images.map((img, idx) => (
                    <div key={img.id ? `img-${img.id}` : `img-idx-${idx}`} className={`admin-prod-img-card ${img.isPrimary ? 'primary' : ''}`}>
                      <div className="admin-prod-img-thumb">
                        <img
                          src={img.imageUrl}
                          alt={`Sản phẩm ${idx + 1}`}
                          onLoad={(e) => {
                            if (!img.width && e.target.naturalWidth) {
                              img.width = e.target.naturalWidth;
                              img.height = e.target.naturalHeight;
                            }
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/100x100?text=Loi+Anh';
                          }}
                        />
                      </div>
                      {img.width ? (
                        <div style={{
                          fontSize: '10px',
                          marginTop: '3px',
                          fontWeight: 600,
                          color: (img.width < 300 || img.height < 300) ? '#ea580c' : '#16a34a',
                          textAlign: 'center'
                        }}>
                          {img.width}×{img.height}px {(img.width < 300 || img.height < 300) ? '(Thấp)' : '(Nét)'}
                        </div>
                      ) : null}
                      <div className="admin-prod-img-actions">
                        {img.isPrimary ? (
                          <span className="admin-prod-img-badge-primary">
                            <Check size={11} /> Ảnh chính
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="admin-prod-img-btn-set"
                            title="Đặt làm ảnh hiển thị chính"
                          >
                            Đặt làm chính
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="admin-prod-img-btn-del"
                          title="Xóa ảnh này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QUẢN LÝ NHIỀU PHIÊN BẢN (VARIANTS) */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Sliders size={17} color="#2563eb" />
                    3. Thiết lập các phiên bản sản phẩm (Màu sắc & Dung lượng)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Người mua hàng có thể bấm chọn trực tiếp Màu và Dung lượng trên thẻ sản phẩm để cập nhật giá tức thì.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="admin-btn-action-primary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.78125rem' }}
                >
                  <Plus size={14} /> Thêm phiên bản
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>STT</th>
                      <th>Tên phiên bản</th>
                      <th style={{ width: '120px' }}>Màu sắc</th>
                      <th style={{ width: '110px' }}>Dung lượng</th>
                      <th style={{ width: '130px' }}>Giá bán (đ)</th>
                      <th style={{ width: '120px' }}>Giá giảm (đ)</th>
                      <th style={{ width: '90px' }}>Tồn kho</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productFormData.variants.map((v, idx) => (
                      <tr key={v.id ? `var-${v.id}` : `v-idx-${idx}`}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="VD: Titan Sa Mạc 256GB"
                            value={v.variantName}
                            onChange={(e) => handleVariantChange(idx, 'variantName', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="VD: Titan Sa Mạc"
                            value={v.color}
                            onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="VD: 256GB"
                            value={v.storage}
                            onChange={(e) => handleVariantChange(idx, 'storage', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="15000000"
                            value={v.price}
                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Để trống nếu không"
                            value={v.salePrice || ''}
                            onChange={(e) => handleVariantChange(idx, 'salePrice', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={v.stockQuantity}
                            onChange={(e) => handleVariantChange(idx, 'stockQuantity', e.target.value)}
                            style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            disabled={productFormData.variants.length <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: productFormData.variants.length <= 1 ? '#cbd5e1' : '#ef4444',
                              cursor: productFormData.variants.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '4px'
                            }}
                            title="Xóa phiên bản này"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Thông số kỹ thuật chi tiết */}
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <SlidersHorizontal size={16} color="#2563eb" />
                    4. Bảng thông số kỹ thuật chi tiết (Tùy biến cho từng loại sản phẩm)
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Tự do tạo tên thông số và mô tả (Ví dụ: Chipset, Màn hình, Hệ điều hành, Pin, Cảm biến...).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.71875rem', color: '#64748b', fontWeight: 600 }}>Mẫu nhanh:</span>
                  {SPEC_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplySpecPreset(preset.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.71875rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {preset.label || preset.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddSpecification}
                    className="btn btn-outline"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#2563eb',
                      borderColor: '#93c5fd',
                      background: '#eff6ff'
                    }}
                  >
                    <Plus size={14} /> Thêm thông số
                  </button>
                </div>
              </div>

              {productFormData.specifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.8125rem' }}>
                  Chưa có thông số kỹ thuật nào. Bấm nút <strong>"+ Thêm thông số"</strong> hoặc chọn <strong>Mẫu nhanh</strong> ở trên.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table className="admin-table" style={{ fontSize: '0.78125rem', marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '220px' }}>Tên thông số (Ví dụ: Chip xử lý, Màn hình...) *</th>
                        <th>Mô tả / Giá trị thông số *</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productFormData.specifications.map((spec, sIdx) => (
                        <tr key={`spec-${sIdx}`}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{sIdx + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={spec.name}
                              onChange={(e) => handleSpecificationChange(sIdx, 'name', e.target.value)}
                              placeholder="VD: Chip xử lý, Hệ điều hành..."
                              className="admin-input-compact"
                              style={{ width: '100%', fontWeight: 600 }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={spec.value}
                              onChange={(e) => handleSpecificationChange(sIdx, 'value', e.target.value)}
                              placeholder="VD: Apple A18 Pro 6 nhân, Super Retina XDR..."
                              className="admin-input-compact"
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecification(sIdx)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Xóa thông số này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 16: XÓA / NGỪNG BÁN SẢN PHẨM (DELETE PRODUCT) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isDeleteProductModalOpen}
          onClose={() => setIsDeleteProductModalOpen(false)}
          title={`Xóa / Ngừng bán sản phẩm: ${productToDelete?.name || ''}`}
          type="danger"
          confirmText={isDeletingProduct ? 'Đang xử lý...' : 'Xác nhận xóa'}
          cancelText="Hủy"
          onConfirm={handleConfirmDeleteProduct}
        >
          {productToDelete && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem' }}>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Bạn có chắc chắn muốn xóa hoặc ngừng bán sản phẩm <strong>"{productToDelete.name}"</strong>?
              </p>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#b45309', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={16} />
                  Cơ chế lưu trữ an toàn (Soft Delete)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
                  Mặc định hệ thống sẽ chuyển sản phẩm về trạng thái ngừng bán (INACTIVE) và đánh dấu deleted_at để bảo toàn lịch sử đơn hàng của khách hàng.
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#0f172a' }}>
                <input
                  type="checkbox"
                  checked={forceDeleteProduct}
                  onChange={(e) => setForceDeleteProduct(e.target.checked)}
                />
                Xóa vĩnh viễn khỏi cơ sở dữ liệu (force = true)
              </label>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 17: XEM CHI TIẾT SẢN PHẨM (PRODUCT DETAIL VIEW) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isProductDetailModalOpen}
          onClose={() => setIsProductDetailModalOpen(false)}
          title={`Chi tiết sản phẩm: ${selectedProductDetail?.name || ''}`}
          type="info"
          maxWidth="750px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsProductDetailModalOpen(false)}
        >
          {selectedProductDetail && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Thumb */}
                <div style={{ width: '130px', height: '130px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {selectedProductDetail.images?.find((img) => img.isPrimary)?.imageUrl || selectedProductDetail.images?.[0]?.imageUrl || selectedProductDetail.imageUrl ? (
                    <img
                      src={selectedProductDetail.images?.find((img) => img.isPrimary)?.imageUrl || selectedProductDetail.images?.[0]?.imageUrl || selectedProductDetail.imageUrl}
                      alt={selectedProductDetail.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Box size={40} color="#94a3b8" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                    {selectedProductDetail.name}
                  </h3>
                  <div style={{ fontSize: '0.78125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Mã sản phẩm: <strong>#{selectedProductDetail.id}</strong> • Slug: <code>/{selectedProductDetail.slug}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span className="status-pill active" style={{ fontSize: '0.71875rem' }}>
                      Danh mục: {selectedProductDetail.category?.name || selectedProductDetail.categoryName || 'Chung'}
                    </span>
                    <span className="status-pill info" style={{ fontSize: '0.71875rem', background: '#eff6ff', color: '#1d4ed8' }}>
                      Hãng: {selectedProductDetail.brand?.name || selectedProductDetail.brandName || 'Chưa phân'}
                    </span>
                    <span className="status-pill" style={{ fontSize: '0.71875rem', background: '#f1f5f9', color: '#334155' }}>
                      Bảo hành: {selectedProductDetail.warrantyMonths ?? 12} tháng
                    </span>
                  </div>
                  {selectedProductDetail.shortDescription && (
                    <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0.25rem 0' }}>
                      {selectedProductDetail.shortDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* Variants table */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Danh sách phiên bản ({selectedProductDetail.variants?.length || 0} phiên bản):
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ fontSize: '0.78125rem' }}>
                    <thead>
                      <tr>
                        <th>Tên phiên bản</th>
                        <th>Màu sắc</th>
                        <th>Dung lượng</th>
                        <th style={{ textAlign: 'right' }}>Giá niêm yết</th>
                        <th style={{ textAlign: 'right' }}>Giá khuyến mại</th>
                        <th style={{ textAlign: 'center' }}>Tồn kho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedProductDetail.variants || []).map((v) => {
                        let color = v.color || '';
                        let storage = v.storage || '';
                        if (v.attributes) {
                          try {
                            const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                            color = color || attr.color || '—';
                            storage = storage || attr.storage || '—';
                          } catch {}
                        }
                        return (
                          <tr key={v.id || v.sku}>
                            <td style={{ fontWeight: 600 }}>{v.variantName}</td>
                            <td>{color || '—'}</td>
                            <td>{storage || '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                              {Number(v.price).toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'right', color: '#dc2626' }}>
                              {v.salePrice ? Number(v.salePrice).toLocaleString('vi-VN') + ' đ' : '—'}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {v.stockQuantity ?? 100}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technical Specifications Table */}
              {(() => {
                const parsed = parseProductSpecs(selectedProductDetail.description || '');
                if (!parsed.specs || parsed.specs.length === 0) return null;
                return (
                  <div style={{ marginTop: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <SlidersHorizontal size={15} color="#2563eb" />
                      Thông số kỹ thuật chi tiết ({parsed.specs.length} mục):
                    </h4>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table className="admin-table" style={{ fontSize: '0.78125rem', marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '220px' }}>Tên thông số</th>
                            <th>Mô tả chi tiết</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.specs.map((s, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                              <td style={{ fontWeight: 600, color: '#334155' }}>{s.name}</td>
                              <td style={{ color: '#0f172a' }}>{s.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 7: XEM CHI TIẾT ĐƠN HÀNG ADMIN */}
        {/* =================================================================== */}
        <OrderDetailModal
          isOpen={Boolean(selectedOrderForDetail)}
          onClose={() => setSelectedOrderForDetail(null)}
          order={selectedOrderForDetail}
        />

        {/* =================================================================== */}
        {/* MODAL 8: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={Boolean(statusChangeTarget)}
          onClose={() => { setStatusChangeTarget(null); setCancelReasonInput(''); }}
          title={`Cập nhật trạng thái đơn hàng #${statusChangeTarget?.order?.id}`}
          type={statusChangeTarget?.newStatus === 'CANCELLED' ? 'danger' : 'confirm'}
          confirmText={statusChangeLoading ? 'Đang cập nhật...' : 'Xác nhận chuyển'}
          cancelText="Hủy bỏ"
          onConfirm={handleUpdateOrderStatus}
        >
          {statusChangeTarget && (
            <div style={{ textAlign: 'left', fontSize: '0.875rem', color: '#334155' }}>
              <p style={{ marginBottom: '1rem' }}>
                Chuyển đơn hàng <strong>#{statusChangeTarget.order.id}</strong> từ trạng thái{' '}
                <span className="status-pill active" style={{ display: 'inline', padding: '2px 8px' }}>
                  {statusChangeTarget.order.status}
                </span>{' '}
                sang{' '}
                <span className="status-pill active" style={{ display: 'inline', padding: '2px 8px', background: '#000000', color: '#ffffff' }}>
                  {statusChangeTarget.newStatus}
                </span>
                ?
              </p>
              {statusChangeTarget.newStatus === 'CANCELLED' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Lý do hủy đơn hàng:
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    style={{ width: '100%' }}
                    placeholder="VD: Khách đổi ý, hết hàng tồn kho, không liên lạc được..."
                    value={cancelReasonInput}
                    onChange={(e) => setCancelReasonInput(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 9: XÁC NHẬN XÓA SẢN PHẨM SHOP (STT 50) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={Boolean(shopProductToDelete)}
          onClose={() => setShopProductToDelete(null)}
          title={`Xác nhận xóa sản phẩm #${shopProductToDelete?.id}`}
          type="danger"
          confirmText={isDeletingShopProduct ? 'Đang xóa...' : 'Xác nhận xóa'}
          cancelText="Giữ lại"
          onConfirm={handleDeleteShopProduct}
        >
          {shopProductToDelete && (
            <p style={{ textAlign: 'left', fontSize: '0.875rem', color: '#334155' }}>
              Bạn có chắc chắn muốn ngừng kinh doanh và xóa sản phẩm <strong>"{shopProductToDelete.name}"</strong> khỏi cửa hàng? Hành động này sẽ loại bỏ sản phẩm khỏi danh mục quản lý.
            </p>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 10: QUẢN LÝ BIẾN THỂ SẢN PHẨM CỬA HÀNG (STT 51-53) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          title={`Quản lý Biến thể (STT 51-53) - ${activeShopProduct?.name || ''}`}
          type="info"
          maxWidth="820px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsVariantModalOpen(false)}
        >
          <div style={{ textAlign: 'left', fontSize: '0.84375rem', color: '#334155' }}>
            {/* Danh sách biến thể hiện có */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                Danh sách biến thể hiện có ({productVariants.length}):
              </h4>
              {variantsLoading ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Đang tải biến thể...</div>
              ) : productVariants.length === 0 ? (
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem' }}>
                  Chưa có biến thể nào được tạo cho sản phẩm này.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="admin-table" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Mã SKU</th>
                        <th>Màu sắc</th>
                        <th>Dung lượng</th>
                        <th style={{ textAlign: 'right' }}>Giá bán</th>
                        <th style={{ textAlign: 'center' }}>Tồn kho</th>
                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productVariants.map((v) => (
                        <tr key={v.id || v.sku}>
                          <td style={{ fontWeight: 600 }}>{v.sku || '—'}</td>
                          <td>{v.color || '—'}</td>
                          <td>{v.storage || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {formatVND(v.price || 0)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{v.stockQuantity ?? 10}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="admin-btn-action-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                                onClick={() => {
                                  setEditingVariant(v);
                                  setVariantForm({
                                    sku: v.sku || '',
                                    color: v.color || '',
                                    storage: v.storage || '',
                                    price: v.price || '',
                                    originalPrice: v.originalPrice || '',
                                    stockQuantity: v.stockQuantity ?? 10,
                                    imageUrl: v.imageUrl || ''
                                  });
                                }}
                                title="STT 52: Sửa biến thể"
                              >
                                <Edit size={12} /> Sửa
                              </button>
                              <button
                                type="button"
                                className="admin-btn-action-danger"
                                style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                                onClick={() => handleDeleteVariant(v.id)}
                                title="STT 53: Xóa biến thể"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Form Thêm / Cập nhật biến thể */}
            <form onSubmit={handleSaveVariant} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editingVariant ? `Cập nhật biến thể #${editingVariant.id} (STT 52)` : 'Thêm biến thể mới (STT 51)'}
                </h4>
                {editingVariant && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}
                    onClick={() => {
                      setEditingVariant(null);
                      setVariantForm({
                        sku: '',
                        color: '',
                        storage: '',
                        price: activeShopProduct?.price || '',
                        originalPrice: activeShopProduct?.originalPrice || '',
                        stockQuantity: 10,
                        imageUrl: activeShopProduct?.primaryImage || ''
                      });
                    }}
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Mã SKU:</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="VD: IPHONE-15-TITAN-128"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Màu sắc:</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="VD: Titan Tự Nhiên, Đen, Xanh..."
                    value={variantForm.color}
                    onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Dung lượng / Phiên bản:</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="VD: 128GB, 256GB, 1TB..."
                    value={variantForm.storage}
                    onChange={(e) => setVariantForm({ ...variantForm, storage: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Giá bán (VND) *:</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    placeholder="VD: 28990000"
                    required
                    value={variantForm.price}
                    onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Số lượng tồn kho:</label>
                  <input
                    type="number"
                    className="admin-form-input"
                    placeholder="VD: 50"
                    value={variantForm.stockQuantity}
                    onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>URL hình ảnh biến thể:</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="https://images.unsplash..."
                    value={variantForm.imageUrl}
                    onChange={(e) => setVariantForm({ ...variantForm, imageUrl: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button
                  type="submit"
                  disabled={variantSubmitting}
                  className="admin-btn-action-primary"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {variantSubmitting ? 'Đang lưu...' : (editingVariant ? 'Lưu cập nhật biến thể' : '+ Thêm biến thể')}
                </button>
              </div>
            </form>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL 11: THƯ VIỆN ẢNH SẢN PHẨM CỬA HÀNG (STT 54-56) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          title={`Thư viện hình ảnh (STT 54-56) - ${activeShopProduct?.name || ''}`}
          type="info"
          maxWidth="700px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setIsImageModalOpen(false)}
        >
          <div style={{ textAlign: 'left', fontSize: '0.84375rem', color: '#334155' }}>
            {/* Gallery ảnh hiện tại */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>
                Danh sách hình ảnh hiện có ({productImages.length}):
              </h4>
              {imagesLoading ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Đang tải hình ảnh...</div>
              ) : productImages.length === 0 ? (
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem' }}>
                  Chưa có hình ảnh bổ sung nào trong thư viện.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {productImages.map((img) => (
                    <div
                      key={img.id || img.imageUrl}
                      style={{
                        position: 'relative',
                        border: img.isPrimary ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        padding: '4px'
                      }}
                    >
                      <img
                        src={img.imageUrl}
                        alt="Product"
                        style={{ width: '100%', height: '110px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80';
                        }}
                      />
                      {img.isPrimary && (
                        <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          Ảnh chính
                        </span>
                      )}
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {!img.isPrimary && (
                          <button
                            type="button"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: '0.6875rem', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => handleSetShopPrimaryImage(img)}
                            title="STT 55: Đặt làm ảnh đại diện chính"
                          >
                            Làm ảnh chính
                          </button>
                        )}
                        <button
                          type="button"
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.6875rem', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}
                          onClick={() => handleDeleteImage(img.id)}
                          title="STT 56: Xóa hình ảnh"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Thêm ảnh mới (STT 54) */}
            <form onSubmit={handleSaveImage} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' }}>
                Thêm hình ảnh vào thư viện (STT 54)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                    Đường dẫn hình ảnh (URL) *:
                  </label>
                  <input
                    type="url"
                    className="admin-form-input"
                    style={{ width: '100%' }}
                    placeholder="https://images.unsplash.com/photo-..."
                    required
                    value={imageForm.imageUrl}
                    onChange={(e) => setImageForm({ ...imageForm, imageUrl: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={imageForm.isPrimary}
                      onChange={(e) => setImageForm({ ...imageForm, isPrimary: e.target.checked })}
                    />
                    <span>Đặt làm ảnh đại diện chính (isPrimary)</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Thứ tự hiển thị:</label>
                    <input
                      type="number"
                      style={{ width: '60px' }}
                      className="admin-form-input"
                      value={imageForm.sortOrder}
                      onChange={(e) => setImageForm({ ...imageForm, sortOrder: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                <button
                  type="submit"
                  disabled={imageSubmitting}
                  className="admin-btn-action-primary"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {imageSubmitting ? 'Đang thêm...' : '+ Thêm hình ảnh'}
                </button>
              </div>
            </form>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: CHI TIẾT CỬA HÀNG QUẢN TRỊ (STT 68) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showAdminShopDetailModal}
          onClose={() => setShowAdminShopDetailModal(false)}
          title={`Chi tiết cửa hàng: ${selectedAdminShop?.name || ''}`}
          type="info"
          maxWidth="640px"
          showCancel={false}
          confirmText="Đóng"
          onConfirm={() => setShowAdminShopDetailModal(false)}
        >
          {selectedAdminShop && (
            <div style={{ textAlign: 'left', fontSize: '0.84375rem', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <img
                  src={selectedAdminShop.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100'}
                  alt={selectedAdminShop.name}
                  style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedAdminShop.name}
                  </h4>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>/{selectedAdminShop.slug}</div>
                  <div style={{ marginTop: '0.4rem' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: selectedAdminShop.status === 'ACTIVE' ? '#f0fdf4' : '#fff7ed',
                        color: selectedAdminShop.status === 'ACTIVE' ? '#16a34a' : '#ea580c',
                        border: '1px solid currentColor'
                      }}
                    >
                      {selectedAdminShop.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Mã Cửa Hàng (ID):</strong>
                  <span>#{selectedAdminShop.id}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Chủ sở hữu:</strong>
                  <span>{selectedAdminShop.ownerName || 'Chưa cập nhật'} (ID: #{selectedAdminShop.ownerId})</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Email liên hệ:</strong>
                  <span>{selectedAdminShop.contactEmail || 'Chưa có'}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Số điện thoại:</strong>
                  <span>{selectedAdminShop.contactPhone || 'Chưa có'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Địa chỉ kinh doanh:</strong>
                  <span>{selectedAdminShop.address || 'Chưa cập nhật'}</span>
                </div>
                {selectedAdminShop.description && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Mô tả cửa hàng:</strong>
                    <span>{selectedAdminShop.description}</span>
                  </div>
                )}
                {selectedAdminShop.rejectionReason && (
                  <div style={{ gridColumn: 'span 2', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#dc2626' }}>
                    <strong style={{ display: 'block', fontSize: '0.75rem' }}>Lý do từ chối / đình chỉ:</strong>
                    <span>{selectedAdminShop.rejectionReason}</span>
                  </div>
                )}
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Ngày đăng ký:</strong>
                  <span>{selectedAdminShop.createdAt ? new Date(selectedAdminShop.createdAt).toLocaleString('vi-VN') : '—'}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>Cập nhật lần cuối:</strong>
                  <span>{selectedAdminShop.updatedAt ? new Date(selectedAdminShop.updatedAt).toLocaleString('vi-VN') : '—'}</span>
                </div>
              </div>
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-action-primary"
                  onClick={() => {
                    setShowAdminShopDetailModal(false);
                    handleOpenEditAdminShop(selectedAdminShop);
                  }}
                >
                  <Edit size={15} /> Chỉnh sửa thông tin Shop
                </button>
              </div>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: CẬP NHẬT TRẠNG THÁI CỬA HÀNG (STT 69) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showAdminShopStatusModal}
          onClose={() => setShowAdminShopStatusModal(false)}
          title={`Cập nhật trạng thái cửa hàng: ${targetShopForStatus?.name || ''}`}
          type={newShopStatus === 'REJECTED' || newShopStatus === 'SUSPENDED' ? 'danger' : 'confirm'}
          confirmText={updatingShopStatus ? 'Đang cập nhật...' : 'Xác nhận thay đổi'}
          onConfirm={handleSaveShopStatus}
          isLoading={updatingShopStatus}
        >
          {targetShopForStatus && (
            <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
              <p style={{ margin: '0 0 1rem', color: '#64748b' }}>
                Thay đổi trạng thái hoạt động kinh doanh của cửa hàng <strong>"{targetShopForStatus.name}"</strong> (ID: #{targetShopForStatus.id}).
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Trạng thái mới *:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={newShopStatus}
                  onChange={(e) => setNewShopStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE - Duyệt & Cho phép hoạt động bình thường</option>
                  <option value="SUSPENDED">SUSPENDED - Tạm ngừng / Đình chỉ hoạt động</option>
                  <option value="REJECTED">REJECTED - Từ chối phê duyệt cửa hàng</option>
                  <option value="PENDING">PENDING - Đưa về hàng đợi chờ duyệt</option>
                </select>
              </div>

              {(newShopStatus === 'REJECTED' || newShopStatus === 'SUSPENDED') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                    Lý do từ chối / đình chỉ kinh doanh:
                  </label>
                  <textarea
                    className="admin-form-input"
                    style={{ width: '100%', minHeight: '80px', padding: '0.5rem' }}
                    placeholder="Nhập lý do cụ thể gửi tới chủ cửa hàng..."
                    value={shopRejectionReason}
                    onChange={(e) => setShopRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: ĐIỀU CHỈNH TỒN KHO BIẾN THỂ (STT 72) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          title={`Điều chỉnh tồn kho (STT 72) - ${selectedInventoryItem?.productName || ''}`}
          type="confirm"
          confirmText={adjustingLoading ? 'Đang điều chỉnh...' : 'Xác nhận điều chỉnh'}
          onConfirm={handleSaveAdjustInventory}
          isLoading={adjustingLoading}
        >
          {selectedInventoryItem && (
            <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedInventoryItem.productName}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Phiên bản: <strong>{selectedInventoryItem.variantName}</strong> | SKU: <code>{selectedInventoryItem.sku}</code>
                </div>
                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
                  Tồn kho hiện tại: <strong style={{ color: '#2563eb', fontSize: '1rem' }}>{selectedInventoryItem.quantity}</strong> sản phẩm
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số lượng thay đổi (+ để nhập thêm, - để xuất bớt) *:
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="VD: +20 hoặc -5"
                  value={adjustChangeQuantity}
                  onChange={(e) => setAdjustChangeQuantity(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Tồn kho dự kiến sau điều chỉnh: <strong>{Math.max(0, Number(selectedInventoryItem.quantity || 0) + Number(adjustChangeQuantity || 0))}</strong>
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Lý do điều chỉnh kho *:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="VD: Nhập thêm hàng mới, Kiểm kê định kỳ, Hàng hỏng xuất bỏ..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: CHỈNH SỬA CỬA HÀNG (ADMIN) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showEditAdminShopModal}
          onClose={() => setShowEditAdminShopModal(false)}
          title={`Chỉnh sửa cửa hàng: ${editingAdminShop?.name || ''}`}
          type="confirm"
          maxWidth="640px"
          confirmText={isSavingAdminShop ? 'Đang lưu...' : 'Lưu thay đổi'}
          cancelText="Hủy"
          onConfirm={handleSaveAdminShop}
          isLoading={isSavingAdminShop}
        >
          <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tên cửa hàng *:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                value={editAdminShopData.name}
                onChange={(e) => setEditAdminShopData({ ...editAdminShopData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số điện thoại:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={editAdminShopData.phone}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, phone: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email liên hệ:
                </label>
                <input
                  type="email"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={editAdminShopData.email}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Logo URL:
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="https://..."
                  value={editAdminShopData.logoUrl}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, logoUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Banner URL:
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="https://..."
                  value={editAdminShopData.bannerUrl}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, bannerUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tỉnh / Thành phố:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={editAdminShopData.province}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, province: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Quận / Huyện:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={editAdminShopData.district}
                  onChange={(e) => setEditAdminShopData({ ...editAdminShopData, district: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Địa chỉ chi tiết:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                placeholder="Số nhà, đường, phường/xã..."
                value={editAdminShopData.addressDetail}
                onChange={(e) => setEditAdminShopData({ ...editAdminShopData, addressDetail: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mô tả cửa hàng:
              </label>
              <textarea
                className="admin-form-input"
                style={{ width: '100%', minHeight: '75px', resize: 'vertical' }}
                value={editAdminShopData.description}
                onChange={(e) => setEditAdminShopData({ ...editAdminShopData, description: e.target.value })}
              />
            </div>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: TẠO CỬA HÀNG MỚI (ADMIN) */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showCreateShopModal}
          onClose={() => setShowCreateShopModal(false)}
          title="Tạo / Đăng ký Cửa hàng mới"
          type="confirm"
          maxWidth="640px"
          confirmText={isCreatingShop ? 'Đang tạo...' : 'Tạo cửa hàng'}
          cancelText="Hủy"
          onConfirm={handleCreateShop}
          isLoading={isCreatingShop}
        >
          <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tên cửa hàng *:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                placeholder="VD: Cyber Tech Store..."
                value={createShopData.name}
                onChange={(e) => setCreateShopData({ ...createShopData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số điện thoại:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="0912..."
                  value={createShopData.phone}
                  onChange={(e) => setCreateShopData({ ...createShopData, phone: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email liên hệ:
                </label>
                <input
                  type="email"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="shop@example.com"
                  value={createShopData.email}
                  onChange={(e) => setCreateShopData({ ...createShopData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Logo URL:
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="https://..."
                  value={createShopData.logoUrl}
                  onChange={(e) => setCreateShopData({ ...createShopData, logoUrl: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Banner URL:
                </label>
                <input
                  type="url"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="https://..."
                  value={createShopData.bannerUrl}
                  onChange={(e) => setCreateShopData({ ...createShopData, bannerUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tỉnh / Thành phố:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="Hà Nội, TP.HCM..."
                  value={createShopData.province}
                  onChange={(e) => setCreateShopData({ ...createShopData, province: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Quận / Huyện:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="Cầu Giấy, Quận 1..."
                  value={createShopData.district}
                  onChange={(e) => setCreateShopData({ ...createShopData, district: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Địa chỉ chi tiết:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                placeholder="Số nhà, đường phố..."
                value={createShopData.addressDetail}
                onChange={(e) => setCreateShopData({ ...createShopData, addressDetail: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mô tả cửa hàng:
              </label>
              <textarea
                className="admin-form-input"
                style={{ width: '100%', minHeight: '75px', resize: 'vertical' }}
                placeholder="Giới thiệu về cửa hàng..."
                value={createShopData.description}
                onChange={(e) => setCreateShopData({ ...createShopData, description: e.target.value })}
              />
            </div>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: TẠO MÃ GIẢM GIÁ MỚI */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showCreateCouponModal}
          onClose={() => setShowCreateCouponModal(false)}
          title="Tạo Mã Giảm Giá Mới"
          type="confirm"
          maxWidth="680px"
          confirmText={isSavingCoupon ? 'Đang tạo...' : 'Tạo mã giảm giá'}
          cancelText="Hủy"
          onConfirm={() => handleSaveCoupon(false)}
          isLoading={isSavingCoupon}
        >
          <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Cửa hàng áp dụng *:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.shopId}
                  onChange={(e) => setCouponFormData({ ...couponFormData, shopId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn cửa hàng --</option>
                  {adminShops.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} (#{sh.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mã Voucher (Code) *:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  placeholder="VD: SUMMER2026, CYBER50K..."
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tên chương trình ưu đãi *:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                placeholder="VD: Giảm 20% Chào Hè rực rỡ..."
                value={couponFormData.name}
                onChange={(e) => setCouponFormData({ ...couponFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Loại giảm giá *:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.discountType}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value })}
                >
                  <option value="PERCENTAGE">Giảm theo Phần trăm (%)</option>
                  <option value="FIXED_AMOUNT">Giảm Số tiền cố định (VNĐ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mức giảm ({couponFormData.discountType === 'PERCENTAGE' ? '%' : 'VNĐ'}) *:
                </label>
                <input
                  type="number"
                  step="any"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder={couponFormData.discountType === 'PERCENTAGE' ? 'VD: 20' : 'VD: 50000'}
                  value={couponFormData.discountValue}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              {couponFormData.discountType === 'PERCENTAGE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Giảm tối đa (VNĐ):
                  </label>
                  <input
                    type="number"
                    className="admin-form-input"
                    style={{ width: '100%' }}
                    placeholder="VD: 100000 (để trống nếu không giới hạn)"
                    value={couponFormData.maxDiscountAmount}
                    onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscountAmount: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Đơn hàng tối thiểu (VNĐ):
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="VD: 200000 (mặc định 0đ)"
                  value={couponFormData.minOrderAmount}
                  onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tổng số lượt sử dụng tối đa:
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="VD: 500 (để trống nếu không giới hạn)"
                  value={couponFormData.usageLimit}
                  onChange={(e) => setCouponFormData({ ...couponFormData, usageLimit: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Lượt dùng / Mỗi khách hàng:
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  placeholder="VD: 1 hoặc 2 (để trống nếu không giới hạn)"
                  value={couponFormData.perUserLimit}
                  onChange={(e) => setCouponFormData({ ...couponFormData, perUserLimit: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Thời gian bắt đầu *:
                </label>
                <input
                  type="datetime-local"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.startAt}
                  onChange={(e) => setCouponFormData({ ...couponFormData, startAt: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Thời gian kết thúc *:
                </label>
                <input
                  type="datetime-local"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.endAt}
                  onChange={(e) => setCouponFormData({ ...couponFormData, endAt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Trạng thái khởi tạo:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.status}
                  onChange={(e) => setCouponFormData({ ...couponFormData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE (Kích hoạt ngay)</option>
                  <option value="DRAFT">DRAFT (Lưu bản nháp)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mô tả chi tiết / Thể lệ áp dụng:
              </label>
              <textarea
                className="admin-form-input"
                style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                placeholder="Điều kiện áp dụng ưu đãi..."
                value={couponFormData.description}
                onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
              />
            </div>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: CHỈNH SỬA MÃ GIẢM GIÁ */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showEditCouponModal}
          onClose={() => setShowEditCouponModal(false)}
          title={`Chỉnh sửa mã giảm giá: ${couponFormData.code || ''}`}
          type="confirm"
          maxWidth="680px"
          confirmText={isSavingCoupon ? 'Đang lưu...' : 'Lưu thay đổi'}
          cancelText="Hủy"
          onConfirm={() => handleSaveCoupon(true)}
          isLoading={isSavingCoupon}
        >
          <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Cửa hàng áp dụng *:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.shopId}
                  onChange={(e) => setCouponFormData({ ...couponFormData, shopId: e.target.value })}
                  required
                >
                  {adminShops.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.name} (#{sh.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mã Voucher (Code) *:
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tên chương trình ưu đãi *:
              </label>
              <input
                type="text"
                className="admin-form-input"
                style={{ width: '100%' }}
                value={couponFormData.name}
                onChange={(e) => setCouponFormData({ ...couponFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Loại giảm giá *:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.discountType}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value })}
                >
                  <option value="PERCENTAGE">Giảm theo Phần trăm (%)</option>
                  <option value="FIXED_AMOUNT">Giảm Số tiền cố định (VNĐ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mức giảm ({couponFormData.discountType === 'PERCENTAGE' ? '%' : 'VNĐ'}) *:
                </label>
                <input
                  type="number"
                  step="any"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.discountValue}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              {couponFormData.discountType === 'PERCENTAGE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Giảm tối đa (VNĐ):
                  </label>
                  <input
                    type="number"
                    className="admin-form-input"
                    style={{ width: '100%' }}
                    value={couponFormData.maxDiscountAmount}
                    onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscountAmount: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Đơn hàng tối thiểu (VNĐ):
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.minOrderAmount}
                  onChange={(e) => setCouponFormData({ ...couponFormData, minOrderAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tổng số lượt sử dụng tối đa:
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.usageLimit}
                  onChange={(e) => setCouponFormData({ ...couponFormData, usageLimit: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Lượt dùng / Mỗi khách hàng:
                </label>
                <input
                  type="number"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.perUserLimit}
                  onChange={(e) => setCouponFormData({ ...couponFormData, perUserLimit: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Thời gian bắt đầu *:
                </label>
                <input
                  type="datetime-local"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.startAt}
                  onChange={(e) => setCouponFormData({ ...couponFormData, startAt: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Thời gian kết thúc *:
                </label>
                <input
                  type="datetime-local"
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.endAt}
                  onChange={(e) => setCouponFormData({ ...couponFormData, endAt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Trạng thái:
                </label>
                <select
                  className="admin-form-input"
                  style={{ width: '100%' }}
                  value={couponFormData.status}
                  onChange={(e) => setCouponFormData({ ...couponFormData, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                  <option value="DRAFT">DRAFT (Bản nháp)</option>
                  <option value="INACTIVE">INACTIVE (Đã tắt)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mô tả chi tiết / Thể lệ áp dụng:
              </label>
              <textarea
                className="admin-form-input"
                style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                value={couponFormData.description}
                onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
              />
            </div>
          </div>
        </ConfirmModal>

        {/* =================================================================== */}
        {/* MODAL: XÁC NHẬN XÓA MÃ GIẢM GIÁ */}
        {/* =================================================================== */}
        <ConfirmModal
          isOpen={showDeleteCouponModal}
          onClose={() => setShowDeleteCouponModal(false)}
          title={`Xóa mã giảm giá: ${targetCouponForDelete?.code || ''}`}
          type="danger"
          confirmText={isDeletingCoupon ? 'Đang xóa...' : 'Xác nhận Xóa'}
          cancelText="Hủy"
          onConfirm={handleDeleteCoupon}
          isLoading={isDeletingCoupon}
          message={
            targetCouponForDelete?.usageCount > 0
              ? `Mã "${targetCouponForDelete?.code}" đã có ${targetCouponForDelete?.usageCount} lượt sử dụng. Để bảo đảm dữ liệu đơn hàng, hệ thống sẽ chuyển trạng thái sang INACTIVE (vô hiệu hóa).`
              : `Bạn có chắc chắn muốn xóa vĩnh viễn mã giảm giá "${targetCouponForDelete?.code}"? Hành động này không thể hoàn tác.`
          }
        />
      </div>
    </div>
  );
};

