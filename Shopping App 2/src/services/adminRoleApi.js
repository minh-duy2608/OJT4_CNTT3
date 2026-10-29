import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1/admin` 
  : '/api/v1/admin';

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
      let errorMessage = data?.message || 'Có lỗi xảy ra khi gọi API Vai trò & Quyền';
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
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Role & Permission Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

export const adminRoleApi = {
  /**
   * STT 18: GET /admin/roles - Danh sách vai trò
   */
  async getRoles() {
    return await request('/roles', { method: 'GET' });
  },

  /**
   * STT 19: GET /admin/roles/{roleId} - Chi tiết vai trò kèm quyền
   */
  async getRoleById(roleId) {
    return await request(`/roles/${roleId}`, { method: 'GET' });
  },

  /**
   * STT 20: POST /admin/roles - Tạo vai trò mới
   * @param {Object} data - { code, name, description, permissionCodes: [] }
   */
  async createRole(data) {
    return await request('/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 21: PATCH /admin/roles/{roleId} - Cập nhật vai trò
   * @param {number|string} roleId
   * @param {Object} data - { name, description }
   */
  async updateRole(roleId, data) {
    return await request(`/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 22: DELETE /admin/roles/{roleId} - Xóa vai trò tùy chỉnh
   */
  async deleteRole(roleId) {
    return await request(`/roles/${roleId}`, { method: 'DELETE' });
  },

  /**
   * STT 23: GET /admin/permissions - Danh sách tất cả quyền
   */
  async getPermissions() {
    return await request('/permissions', { method: 'GET' });
  },

  /**
   * STT 24: GET /admin/roles/{roleId}/permissions - Danh sách quyền của vai trò
   */
  async getRolePermissions(roleId) {
    return await request(`/roles/${roleId}/permissions`, { method: 'GET' });
  },

  /**
   * STT 25: PUT /admin/roles/{roleId}/permissions - Gán/thay thế danh sách quyền của vai trò
   * @param {number|string} roleId
   * @param {Object} data - { permissionCodes: [] }
   */
  async assignRolePermissions(roleId, data) {
    return await request(`/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 26: GET /auth/me/permissions - Danh sách quyền của người dùng hiện tại
   */
  async getMyPermissions() {
    const authUrl = import.meta.env.VITE_API_URL 
      ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1/auth/me/permissions` 
      : '/api/v1/auth/me/permissions';
    const token = getStoredAccessToken();
    const res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || 'Không thể lấy quyền cá nhân');
    }
    return data?.data !== undefined ? data.data : data;
  }
};
