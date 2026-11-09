import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}` 
  : '';

async function request(endpoint, options = {}, isRetry = false) {
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
        } catch (refreshErr) {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'Lỗi kiểm tra hệ thống');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const systemApi = {
  /**
   * STT 163: GET /health - Kiểm tra tình trạng hoạt động cơ bản của hệ thống (Public)
   */
  async getHealth() {
    return await request('/health', { method: 'GET' });
  },

  /**
   * STT 164: GET /me - Xem thông tin người dùng đang đăng nhập
   */
  async getMyProfile() {
    return await request('/me', { method: 'GET' });
  },

  /**
   * STT 165: GET /config/public - Cấu hình công khai của hệ thống
   */
  async getPublicConfig() {
    return await request('/config/public', { method: 'GET' });
  },

  /**
   * STT 166: GET /admin/health - Kiểm tra chi tiết tình trạng hệ thống, DB, RAM (ADMIN)
   */
  async getAdminHealth() {
    return await request('/admin/health', { method: 'GET' });
  }
};
