/**
 * Auth API Client for Shopping App (Microservice IAM Architecture)
 * Supports all 11 Authentication endpoints with automatic token handling
 */

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/auth` 
  : '/auth';

export const TOKEN_STORAGE_KEY = 'CYBER_ACCESS_TOKEN';
export const REFRESH_TOKEN_STORAGE_KEY = 'CYBER_REFRESH_TOKEN';

export const getStoredAccessToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

export const setStoredTokens = (accessToken, refreshToken) => {
  if (accessToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
};

export const clearStoredTokens = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

/**
 * Base HTTP request wrapper with JSON headers, Bearer Auth & error parsing
 */
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

    // If 401 Unauthorized and not already retrying, attempt auto-refresh
    if (response.status === 401 && !isRetry && endpoint !== '/login' && endpoint !== '/refresh') {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          if (refreshRes && refreshRes.accessToken) {
            setStoredTokens(refreshRes.accessToken, refreshRes.refreshToken);
            // Retry the failed request with the new access token
            return request(endpoint, options, true);
          }
        } catch (refreshErr) {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      let errorMessage = data?.message || 'Có lỗi xảy ra trong quá trình xử lý';
      if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const fieldErrors = Object.values(data.data).join(', ');
        if (fieldErrors) {
          errorMessage = `${errorMessage}: ${fieldErrors}`;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra kết nối mạng hoặc server.');
      netError.status = 503;
      throw netError;
    }
    throw err;
  }
}

export const authApi = {
  /**
   * 1. POST /auth/register - Đăng ký tài khoản khách hàng (Public)
   */
  register: async ({ username, email, password, fullName, phone }) => {
    const res = await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim(),
        password,
        fullName: fullName?.trim() || null,
        phone: phone?.trim() || null
      })
    });
    return res?.data;
  },

  /**
   * 2. POST /auth/login - Đăng nhập, cấp JWT & Refresh Token (Public)
   */
  login: async ({ username, password }) => {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: username.trim(),
        password
      })
    });
    const loginData = res?.data;
    if (loginData?.accessToken) {
      setStoredTokens(loginData.accessToken, loginData.refreshToken);
    }
    return loginData;
  },

  /**
   * 3. POST /auth/refresh - Làm mới access token (Public / Token hợp lệ)
   */
  refresh: async (refreshToken) => {
    const tokenToUse = refreshToken || getStoredRefreshToken();
    if (!tokenToUse) {
      throw new Error('Không tìm thấy refresh token');
    }
    const res = await request('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokenToUse })
    });
    const data = res?.data;
    if (data?.accessToken) {
      setStoredTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  /**
   * 4. POST /auth/logout - Đăng xuất, thu hồi refresh token (Authenticated)
   */
  logout: async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      await request('/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    } catch (e) {
      console.warn('Backend logout warning:', e.message);
    } finally {
      clearStoredTokens();
    }
    return true;
  },

  /**
   * 5. GET /auth/me - Lấy thông tin tài khoản hiện tại (Authenticated)
   */
  getMe: async () => {
    const res = await request('/me', {
      method: 'GET'
    });
    return res?.data;
  },

  /**
   * 6. PATCH /auth/me - Cập nhật thông tin cá nhân (Authenticated)
   */
  updateProfile: async ({ fullName, phone, avatarUrl }) => {
    const res = await request('/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: fullName !== undefined ? fullName : null,
        phone: phone !== undefined ? phone : null,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : null
      })
    });
    return res?.data;
  },

  /**
   * 7. PATCH /auth/me/password - Đổi mật khẩu (Authenticated)
   */
  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    const res = await request('/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword
      })
    });
    return res;
  },

  /**
   * 8. POST /auth/forgot-password - Yêu cầu khôi phục mật khẩu (Public)
   */
  forgotPassword: async (email) => {
    const res = await request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() })
    });
    return res?.data;
  },

  /**
   * 9. POST /auth/reset-password - Đặt lại mật khẩu bằng token (Public)
   */
  resetPassword: async ({ token, newPassword, confirmPassword }) => {
    const res = await request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: token.trim(),
        newPassword,
        confirmPassword
      })
    });
    return res;
  },

  /**
   * 10. POST /auth/verify-email - Xác minh email qua token (Public)
   */
  verifyEmail: async (token) => {
    const res = await request('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: token.trim() })
    });
    return res;
  },

  /**
   * 11. POST /auth/resend-verification - Gửi lại email xác minh (Public)
   */
  resendVerification: async (email) => {
    const res = await request('/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() })
    });
    return res?.data;
  }
};

