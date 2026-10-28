import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'CYBER_AUTH_USER_V1';

const INITIAL_ADDRESSES = [
  {
    id: 'addr-1',
    fullName: 'Hoàng Sơn',
    phone: '0362490374',
    detailAddress: 'Số 12, Đường Nguyễn Văn Cừ, Phường 4, Quận 5',
    city: 'TP. Hồ Chí Minh',
    type: 'home', // 'home' | 'office'
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

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync auth state:', e);
    }
  }, [user]);

  const login = (userData) => {
    const loggedUser = {
      name: userData?.name || 'Hoàng Sơn',
      email: userData?.email || 'son666727@gmail.com',
      phone: userData?.phone || '0362490374',
      avatar: userData?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      addresses: userData?.addresses && userData.addresses.length > 0 ? userData.addresses : INITIAL_ADDRESSES
    };
    setUser(loggedUser);
    return loggedUser;
  };

  const register = (userData) => {
    const newUser = {
      name: userData?.name || 'Thành viên mới',
      email: userData?.email || 'newuser@example.com',
      phone: userData?.phone || '0900 000 000',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      addresses: INITIAL_ADDRESSES
    };
    setUser(newUser);
    return newUser;
  };

  const updateProfile = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updatedFields };
    });
    return true;
  };

  // Quản lý Địa chỉ nhận hàng
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

      // Nếu xóa địa chỉ mặc định, tự động gán địa chỉ đầu tiên còn lại làm mặc định
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

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        updateProfile,
        addresses: user?.addresses || [],
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        logout
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
