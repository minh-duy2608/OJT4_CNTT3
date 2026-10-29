import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminUserApi } from '../services/adminUserApi';
import { adminRoleApi } from '../services/adminRoleApi';
import { categoryApi } from '../services/categoryApi';
import { brandApi } from '../services/brandApi';
import { ConfirmModal } from '../components/ConfirmModal';
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
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles' | 'categories' | 'permissions'

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
    try {
      const userRoles = await adminUserApi.getUserRoles(u.id);
      setSelectedRoleCodes(userRoles.map((r) => r.code));
      setIsRoleAssignModalOpen(true);
    } catch (err) {
      // Fallback: extract from user object
      const currentRoles = (u.roles || []).map((r) => (typeof r === 'string' ? r : r.code));
      setSelectedRoleCodes(currentRoles.length > 0 ? currentRoles : [u.role]);
      setIsRoleAssignModalOpen(true);
    }
  };

  const handleSaveUserRoles = async () => {
    if (!roleAssignUser) return;
    if (selectedRoleCodes.length === 0) {
      triggerAlert('Người dùng phải có ít nhất một vai trò hệ thống.', 'error');
      return;
    }
    setIsSavingRoles(true);
    try {
      await adminUserApi.assignUserRoles(roleAssignUser.id, { roles: selectedRoleCodes });
      triggerAlert(`Đã cập nhật tập vai trò cho người dùng ${roleAssignUser.username} thành công!`, 'success');
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
  // 5. TAB: QUYỀN HẠN CỦA TÔI (MY PERMISSIONS - STT 26)
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

  // Preload metrics on mount
  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  // Sync data on tab change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(userPage);
      if (roles.length === 0) fetchRolesAndPermissions();
    } else if (activeTab === 'roles') {
      fetchRolesAndPermissions();
    } else if (activeTab === 'categories') {
      fetchCategories();
    } else if (activeTab === 'brands') {
      fetchBrands();
    } else if (activeTab === 'permissions') {
      fetchMyPermissions();
    }
  }, [activeTab, fetchUsers, fetchRolesAndPermissions, fetchCategories, fetchBrands, fetchMyPermissions, userPage, roles.length]);

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

  // Access Denied Screen if user is not ADMIN
  if (!isAuthenticated || !isAdminUser) {
    return (
      <div className="cyber-admin-page">
        <div className="container">
          <div className="admin-forbidden-view">
            <div className="admin-forbidden-icon-wrap">
              <Lock size={32} />
            </div>
            <h2>Khu vực Quản trị Hệ thống</h2>
            <p>
              Bạn cần có tài khoản quản trị viên (<strong>ADMIN</strong>) để truy cập giao diện và các API quản trị này.
            </p>
            <div className="admin-forbidden-actions">
              <Link to="/login?redirect=/admin" className="admin-btn-action-primary">
                Đăng nhập tài khoản Quản trị
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
            <div className="admin-shield-icon-wrap">
              <ShieldCheck size={26} strokeWidth={2.2} />
            </div>
            <div className="admin-title-group">
              <h1>
                Trung tâm Quản trị Cyber
                <span className="admin-role-badge">Admin Console</span>
              </h1>
              <p>Quản lý toàn diện tài khoản, vai trò phân quyền và danh mục sản phẩm (API 12 - 32)</p>
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
                if (activeTab === 'users') fetchUsers(userPage);
                if (activeTab === 'roles') fetchRolesAndPermissions();
                if (activeTab === 'categories') fetchCategories();
                if (activeTab === 'brands') fetchBrands();
                if (activeTab === 'permissions') fetchMyPermissions();
                triggerAlert('Đã làm mới dữ liệu từ máy chủ.', 'info');
              }}
              className="admin-btn-back-store"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} />
              Làm mới
            </button>
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
        <div className="admin-metrics-grid">
          <div className="admin-metric-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
            <div className="admin-metric-icon-wrap users">
              <Users size={22} />
            </div>
            <div className="admin-metric-info">
              <div className="admin-metric-label">Tổng Người dùng</div>
              <div className="admin-metric-val">{userTotalElements || users.length}</div>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setActiveTab('roles')} style={{ cursor: 'pointer' }}>
            <div className="admin-metric-icon-wrap roles">
              <Shield size={22} />
            </div>
            <div className="admin-metric-info">
              <div className="admin-metric-label">Vai trò & Quyền</div>
              <div className="admin-metric-val">{roles.length} vai trò / {allPermissions.length || 44} quyền</div>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setActiveTab('categories')} style={{ cursor: 'pointer' }}>
            <div className="admin-metric-icon-wrap categories">
              <FolderTree size={22} />
            </div>
            <div className="admin-metric-info">
              <div className="admin-metric-label">Danh mục Sản phẩm</div>
              <div className="admin-metric-val">{categories.length} danh mục</div>
            </div>
          </div>

          <div className="admin-metric-card" onClick={() => setActiveTab('brands')} style={{ cursor: 'pointer' }}>
            <div className="admin-metric-icon-wrap brands">
              <Award size={22} />
            </div>
            <div className="admin-metric-info">
              <div className="admin-metric-label">Thương hiệu</div>
              <div className="admin-metric-val">{brands.length} thương hiệu</div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TOP LEVEL NAVIGATION TABS */}
        {/* =================================================================== */}
        <div className="admin-tabs-bar">
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

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <Key size={17} />
            Quyền hạn của tôi
            <span className="admin-tab-badge">STT 26</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG (USERS - STT 12-17) */}
        {/* =================================================================== */}
        {activeTab === 'users' && (
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
                            <div>
                              {userRolesList.map((rCode) => {
                                const lower = rCode.toLowerCase();
                                return (
                                  <span key={rCode} className={`role-pill ${lower}`}>
                                    {rCode}
                                  </span>
                                );
                              })}
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
        {activeTab === 'roles' && (
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
        {activeTab === 'categories' && (
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
        {activeTab === 'brands' && (
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
        {/* TAB 5: QUYỀN HẠN CỦA TÔI (MY PERMISSIONS - STT 26) */}
        {/* =================================================================== */}
        {activeTab === 'permissions' && (
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
        {/* MODAL 1: CHI TIẾT NGƯỜI DÙNG (API 13) */}
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
                  const isChecked = selectedRoleCodes.includes(r.code);
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
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoleCodes([...selectedRoleCodes, r.code]);
                          } else {
                            setSelectedRoleCodes(selectedRoleCodes.filter((c) => c !== r.code));
                          }
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {r.name} <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>({r.code})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {r.description || 'Vai trò hệ thống'}
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
      </div>
    </div>
  );
};

