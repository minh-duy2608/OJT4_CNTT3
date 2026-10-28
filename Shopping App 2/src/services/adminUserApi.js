import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/admin/users` 
  : '/admin/users';

/**
 * Base HTTP request wrapper for Admin User Management API with Bearer token authentication
 */
async function request(endpoint = '', options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    // If 401 Unauthorized, attempt auto-refresh token once
    if (response.status === 401 && !isRetry) {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          if (refreshRes && refreshRes.accessToken) {
            setStoredTokens(refreshRes.accessToken, refreshRes.refreshToken);
            return request(endpoint, options, true);
          }
        } catch {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      let errorMessage = data?.message || 'Có lỗi xảy ra khi gọi API Quản trị viên';
      if (data?.data && typeof data.data === 'object') {
        const fieldErrors = Object.values(data.data).join(', ');
        if (fieldErrors) errorMessage = fieldErrors;
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Admin Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

export const adminUserApi = {
  /**
   * STT 12: GET /admin/users - Danh sách người dùng (tìm kiếm, lọc theo vai trò, trạng thái, phân trang)
   * @param {Object} params - { keyword, role, status, page, size, sortBy, sortDir }
   */
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.page !== undefined) query.set('page', params.page);
    if (params.size !== undefined) query.set('size', params.size);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);

    const queryString = query.toString();
    return await request(queryString ? `?${queryString}` : '', { method: 'GET' });
  },

  /**
   * STT 13: GET /admin/users/{userId} - Chi tiết người dùng (thông tin, vai trò, sổ địa chỉ)
   */
  async getUserById(userId) {
    return await request(`/${userId}`, { method: 'GET' });
  },

  /**
   * STT 14: PATCH /admin/users/{userId} - Cập nhật thông tin quản trị được phép sửa
   * @param {number|string} userId
   * @param {Object} data - { fullName, phone, avatarUrl, emailVerified }
   */
  async updateUser(userId, data) {
    return await request(`/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 15: PATCH /admin/users/{userId}/status - Khóa hoặc mở khóa tài khoản
   * @param {number|string} userId
   * @param {Object} data - { status: 'ACTIVE' | 'LOCKED' | 'DELETED', reason?: string }
   */
  async updateUserStatus(userId, data) {
    return await request(`/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 16: GET /admin/users/{userId}/roles - Danh sách vai trò của người dùng
   */
  async getUserRoles(userId) {
    return await request(`/${userId}/roles`, { method: 'GET' });
  },

  /**
   * STT 17: PUT /admin/users/{userId}/roles - Gán hoặc thay thế tập vai trò hệ thống theo chính sách
   * @param {number|string} userId
   * @param {Object} data - { roles: ['ADMIN', 'CLIENT', 'SHOP_OWNER', ...] }
   */
  async assignUserRoles(userId, data) {
    return await request(`/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

