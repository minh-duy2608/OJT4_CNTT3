import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  authApi, 
  getStoredAccessToken, 
  getStoredRefreshToken, 
  clearStoredTokens 
} from '../services/authApi';
import { addressApi } from '../services/addressApi';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'CYBER_AUTH_USER_V1';

const filterOutMockAddresses = (addrs) => {
  if (!Array.isArray(addrs)) return [];
  return addrs.filter((a) => a && a.id !== 'addr-1' && a.id !== 'addr-2');
};

const formatUserResponse = (apiUser, existingAddresses = []) => {
  if (!apiUser) return null;
  const cleanAddresses = filterOutMockAddresses(existingAddresses);
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
    roles: Array.isArray(apiUser.roles) ? apiUser.roles : (apiUser.roles ? Array.from(apiUser.roles) : []),
    status: apiUser.status,
    emailVerifiedAt: apiUser.emailVerifiedAt,
    lastLoginAt: apiUser.lastLoginAt,
    createdAt: apiUser.createdAt,
    addresses: cleanAddresses
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.addresses = filterOutMockAddresses(parsed.addresses);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [addresses, setAddresses] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return filterOutMockAddresses(parsed.addresses);
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authenticated session and address book with backend API on mount
  useEffect(() => {
    const syncCurrentUser = async () => {
      const token = getStoredAccessToken();
      if (token) {
        try {
          const apiUser = await authApi.getMe();
          if (apiUser) {
            let addrList = [];
            try {
              addrList = await addressApi.getAll();
            } catch (err) {
              console.warn('Could not load user addresses from server:', err.message);
            }
            const cleanAddrs = filterOutMockAddresses(addrList);
            setAddresses(cleanAddrs);
            setUser(formatUserResponse(apiUser, cleanAddrs));
          }
        } catch (e) {
          console.warn('Could not sync user session from backend:', e.message);
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
        const toSave = { ...user, addresses };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toSave));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync auth state to localStorage:', e);
    }
  }, [user, addresses]);

  // 1. POST /auth/register
  const register = async ({ username, email, password, fullName, phone }) => {
    const apiUser = await authApi.register({
      username: username || email.split('@')[0],
      email,
      password,
      fullName: fullName || null,
      phone: phone || null
    });
    setAddresses([]);
    const formatted = formatUserResponse(apiUser, []);
    setUser(formatted);
    return formatted;
  };

  // 2. POST /auth/login
  const login = async ({ username, password }) => {
    const loginData = await authApi.login({ username, password });
    let addrList = [];
    try {
      addrList = await addressApi.getAll();
    } catch (e) {
      console.warn('Could not fetch addresses on login:', e.message);
    }
    const cleanAddrs = filterOutMockAddresses(addrList);
    setAddresses(cleanAddrs);
    const formatted = formatUserResponse(loginData.user, cleanAddrs);
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
      setAddresses([]);
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
      setUser((prev) => formatUserResponse(updatedApiUser, addresses));
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
        setUser((prev) => formatUserResponse(apiUser, addresses));
      }
    }
    return result;
  };

  // 11. POST /auth/resend-verification
  const resendVerification = async (email) => {
    return await authApi.resendVerification(email || user?.email);
  };

  // Load all addresses from backend
  const loadAddresses = useCallback(async () => {
    if (!getStoredAccessToken()) return [];
    try {
      const list = await addressApi.getAll();
      const cleanList = filterOutMockAddresses(list);
      setAddresses(cleanList);
      setUser((prev) => (prev ? { ...prev, addresses: cleanList } : null));
      return cleanList;
    } catch (err) {
      console.warn('Could not reload addresses:', err.message);
      return [];
    }
  }, []);

  // Quản lý Địa chỉ nhận hàng (CRUD Microservice Endpoint /api/v1/addresses)
  const addAddress = async (newAddress) => {
    if (getStoredAccessToken()) {
      const created = await addressApi.create(newAddress);
      const list = await addressApi.getAll();
      const cleanList = filterOutMockAddresses(list);
      setAddresses(cleanList);
      setUser((prev) => (prev ? { ...prev, addresses: cleanList } : null));
      return created;
    }

    let createdItem = null;
    setAddresses((prev) => {
      const isFirst = prev.length === 0;
      const shouldBeDefault = newAddress.isDefault || isFirst;
      createdItem = {
        ...newAddress,
        id: `addr-${Date.now()}`,
        isDefault: shouldBeDefault
      };
      const updatedList = shouldBeDefault
        ? prev.map((a) => ({ ...a, isDefault: false })).concat(createdItem)
        : prev.concat(createdItem);
      setUser((u) => (u ? { ...u, addresses: updatedList } : null));
      return updatedList;
    });
    return createdItem;
  };

  const updateAddress = async (addrId, updatedData) => {
    if (getStoredAccessToken()) {
      const updated = await addressApi.update(addrId, updatedData);
      const list = await addressApi.getAll();
      const cleanList = filterOutMockAddresses(list);
      setAddresses(cleanList);
      setUser((prev) => (prev ? { ...prev, addresses: cleanList } : null));
      return updated;
    }

    setAddresses((prev) => {
      let updatedList = prev.map((addr) =>
        addr.id === addrId ? { ...addr, ...updatedData } : addr
      );
      if (updatedData.isDefault) {
        updatedList = updatedList.map((addr) =>
          addr.id === addrId ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
        );
      }
      setUser((u) => (u ? { ...u, addresses: updatedList } : null));
      return updatedList;
    });
  };

  const deleteAddress = async (addrId) => {
    if (getStoredAccessToken()) {
      await addressApi.delete(addrId);
      const list = await addressApi.getAll();
      const cleanList = filterOutMockAddresses(list);
      setAddresses(cleanList);
      setUser((prev) => (prev ? { ...prev, addresses: cleanList } : null));
      return true;
    }

    setAddresses((prev) => {
      const itemToDelete = prev.find((a) => a.id === addrId);
      let updatedList = prev.filter((a) => a.id !== addrId);
      if (itemToDelete?.isDefault && updatedList.length > 0) {
        updatedList[0].isDefault = true;
      }
      setUser((u) => (u ? { ...u, addresses: updatedList } : null));
      return updatedList;
    });
  };

  const setDefaultAddress = async (addrId) => {
    if (getStoredAccessToken()) {
      const updated = await addressApi.setDefault(addrId);
      const list = await addressApi.getAll();
      const cleanList = filterOutMockAddresses(list);
      setAddresses(cleanList);
      setUser((prev) => (prev ? { ...prev, addresses: cleanList } : null));
      return updated;
    }

    setAddresses((prev) => {
      const updatedList = prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === addrId
      }));
      setUser((u) => (u ? { ...u, addresses: updatedList } : null));
      return updatedList;
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
        addresses,
        loadAddresses,
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
