import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  authApi, 
  getStoredAccessToken, 
  getStoredRefreshToken, 
  clearStoredTokens 
} from '../services/authApi';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'CYBER_AUTH_USER_V1';

const INITIAL_ADDRESSES = [
  {
    id: 'addr-1',
    fullName: 'Hoàng Sơn',
    phone: '0362490374',
    detailAddress: 'Số 12, Đường Nguyễn Văn Cừ, Phường 4, Quận 5',
    city: 'TP. Hồ Chí Minh',
    type: 'home',
    isDefault: true
  },
  {
    id: 'addr-2',
    fullName: 'Hoàng Sơn (Văn phòng)',
    phone: '0362490374',
    detailAddress: 'Tòa nhà Cyber Tower, Tầng 8, 285 Cách Mạng Tháng Tám, Phường 12, Quận 10',
    city: 'TP. Hồ Chí Minh',
    type: 'office',
    isDefault: false
  }
];

const formatUserResponse = (apiUser, existingAddresses = null) => {
  if (!apiUser) return null;
  return {
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.username,
    fullName: apiUser.fullName,
    phone: apiUser.phone || '',
    avatar: apiUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    avatarUrl: apiUser.avatarUrl,
    role: apiUser.role,
    status: apiUser.status,
    emailVerifiedAt: apiUser.emailVerifiedAt,
    lastLoginAt: apiUser.lastLoginAt,
    createdAt: apiUser.createdAt,
    addresses: existingAddresses && existingAddresses.length > 0 ? existingAddresses : INITIAL_ADDRESSES
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (!parsed.addresses || parsed.addresses.length === 0) {
          parsed.addresses = INITIAL_ADDRESSES;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authenticated session with backend API on mount
  useEffect(() => {
    const syncCurrentUser = async () => {
      const token = getStoredAccessToken();
      if (token) {
        try {
          const apiUser = await authApi.getMe();
          if (apiUser) {
            setUser((prev) => formatUserResponse(apiUser, prev?.addresses));
          }
        } catch (e) {
          console.warn('Could not sync user session from backend:', e.message);
          // If token expired and cannot refresh, logout
          if (e.status === 401 && !getStoredRefreshToken()) {
            logout();
          }
        }
      }
      setIsLoading(false);
    };

    syncCurrentUser();
  }, []);

  // Persist user cache locally
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync auth state to localStorage:', e);
    }
  }, [user]);

  // 1. POST /auth/register
  const register = async ({ username, email, password, fullName, phone }) => {
    const apiUser = await authApi.register({
      username: username || email.split('@')[0],
      email,
      password,
      fullName: fullName || null,
      phone: phone || null
    });
    const formatted = formatUserResponse(apiUser, INITIAL_ADDRESSES);
    setUser(formatted);
    return formatted;
  };

  // 2. POST /auth/login
  const login = async ({ username, password }) => {
    const loginData = await authApi.login({ username, password });
    const formatted = formatUserResponse(loginData.user, user?.addresses || INITIAL_ADDRESSES);
    setUser(formatted);
    return formatted;
  };

  // 4. POST /auth/logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      clearStoredTokens();
      setUser(null);
    }
  };

  // 6. PATCH /auth/me
  const updateProfile = async ({ fullName, phone, avatarUrl, avatar, name }) => {
    const newFullName = fullName !== undefined ? fullName : name;
    const newAvatar = avatarUrl !== undefined ? avatarUrl : avatar;
    const newPhone = phone;

    // Call backend API if user is authenticated
    if (getStoredAccessToken()) {
      const updatedApiUser = await authApi.updateProfile({
        fullName: newFullName,
        phone: newPhone,
        avatarUrl: newAvatar
      });
      setUser((prev) => formatUserResponse(updatedApiUser, prev?.addresses));
      return true;
    }

    // Fallback local update
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        name: newFullName !== undefined ? newFullName : prev.name,
        fullName: newFullName !== undefined ? newFullName : prev.fullName,
        phone: newPhone !== undefined ? newPhone : prev.phone,
        avatar: newAvatar !== undefined ? newAvatar : prev.avatar,
        avatarUrl: newAvatar !== undefined ? newAvatar : prev.avatarUrl
      };
    });
    return true;
  };

  // 7. PATCH /auth/me/password
  const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    return await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
  };

  // 8. POST /auth/forgot-password
  const forgotPassword = async (email) => {
    return await authApi.forgotPassword(email);
  };

  // 9. POST /auth/reset-password
  const resetPassword = async ({ token, newPassword, confirmPassword }) => {
    return await authApi.resetPassword({ token, newPassword, confirmPassword });
  };

  // 10. POST /auth/verify-email
  const verifyEmail = async (token) => {
    const result = await authApi.verifyEmail(token);
    // Refresh user info if logged in
    if (getStoredAccessToken()) {
      const apiUser = await authApi.getMe().catch(() => null);
      if (apiUser) {
        setUser((prev) => formatUserResponse(apiUser, prev?.addresses));
      }
    }
    return result;
  };

  // 11. POST /auth/resend-verification
  const resendVerification = async (email) => {
    return await authApi.resendVerification(email || user?.email);
  };

  // Quản lý Địa chỉ nhận hàng (Client-side & Cart storage)
  const addAddress = (newAddress) => {
    let createdItem = null;
    setUser((prev) => {
      if (!prev) return null;
      const currentList = prev.addresses || [];
      const isFirst = currentList.length === 0;
      const shouldBeDefault = newAddress.isDefault || isFirst;

      const formattedNew = {
        ...newAddress,
        id: `addr-${Date.now()}`,
        isDefault: shouldBeDefault
      };
      createdItem = formattedNew;

      const updatedList = shouldBeDefault
        ? currentList.map((a) => ({ ...a, isDefault: false })).concat(formattedNew)
        : currentList.concat(formattedNew);

      return { ...prev, addresses: updatedList };
    });
    return createdItem;
  };

  const updateAddress = (addrId, updatedData) => {
    setUser((prev) => {
      if (!prev) return null;
      const currentList = prev.addresses || [];
      let updatedList = currentList.map((addr) =>
        addr.id === addrId ? { ...addr, ...updatedData } : addr
      );

      if (updatedData.isDefault) {
        updatedList = updatedList.map((addr) =>
          addr.id === addrId ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
        );
      }

      return { ...prev, addresses: updatedList };
    });
  };

  const deleteAddress = (addrId) => {
    setUser((prev) => {
      if (!prev) return null;
      const currentList = prev.addresses || [];
      const itemToDelete = currentList.find((a) => a.id === addrId);
      let updatedList = currentList.filter((a) => a.id !== addrId);

      if (itemToDelete?.isDefault && updatedList.length > 0) {
        updatedList[0].isDefault = true;
      }

      return { ...prev, addresses: updatedList };
    });
  };

  const setDefaultAddress = (addrId) => {
    setUser((prev) => {
      if (!prev) return null;
      const currentList = prev.addresses || [];
      const updatedList = currentList.map((addr) => ({
        ...addr,
        isDefault: addr.id === addrId
      }));
      return { ...prev, addresses: updatedList };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!getStoredAccessToken(),
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        addresses: user?.addresses || [],
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
