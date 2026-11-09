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
      const error = new Error(data?.message || 'Lỗi truy xuất nhật ký');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const auditLogApi = {
  /**
   * STT 160: GET /admin/audit-logs - Nhật ký thao tác quản trị
   */
  async getAdminAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.entityType) query.append('entityType', params.entityType);
    if (params.shopId) query.append('shopId', params.shopId);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 161: GET /admin/audit-logs/{logId} - Chi tiết nhật ký thao tác
   */
  async getAdminAuditLogDetail(logId) {
    return await request(`/admin/audit-logs/${logId}`, { method: 'GET' });
  },

  /**
   * STT 162: GET /shops/{shopId}/audit-logs - Nhật ký thao tác của cửa hàng
   */
  async getShopAuditLogs(shopId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/shops/${shopId}/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }
};
