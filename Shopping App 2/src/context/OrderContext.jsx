import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orderApi } from '../services/orderApi';
import { useAuth } from './AuthContext';

const OrderContext = createContext();

const ORDERS_STORAGE_KEY = 'CYBER_ORDERS_V1';

// 5 Trạng thái đơn hàng theo đúng yêu cầu
export const ORDER_STATUSES = [
  { key: 'pending', label: 'Chờ xác nhận', step: 1, color: '#f59e0b', bg: '#fef3c7' },
  { key: 'confirmed', label: 'Đã xác nhận', step: 2, color: '#3b82f6', bg: '#eff6ff' },
  { key: 'pickup', label: 'Chờ shipper lấy hàng', step: 3, color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'delivering', label: 'Đang giao', step: 4, color: '#06b6d4', bg: '#ecfeff' },
  { key: 'delivered', label: 'Đã giao', step: 5, color: '#10b981', bg: '#ecfdf5' }
];

export const OrderProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Lọc bỏ hoàn toàn bất kỳ dữ liệu mẫu CYBER-89234 hoặc CYBER-67120
        return Array.isArray(parsed)
          ? parsed.filter(o => o.id !== 'CYBER-89234' && o.id !== 'CYBER-67120')
          : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  // Tải danh sách đơn hàng thực tế từ Backend Database khi đã đăng nhập
  const fetchOrdersFromApi = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await orderApi.getMyOrders({ size: 50 });
      const apiOrders = res?.content || (Array.isArray(res) ? res : []);

      if (Array.isArray(apiOrders)) {
        // Chuẩn hóa dữ liệu từ BE API sang định dạng UI cần hiển thị
        const mapped = apiOrders.map(o => ({
          id: o.orderCode || `CYBER-${o.id}`,
          backendId: o.id,
          createdAt: o.createdAt,
          status: (o.status || 'PENDING').toLowerCase(),
          shippingAddress: {
            fullName: o.recipientName,
            phone: o.recipientPhone,
            detailAddress: o.shippingAddress,
            city: ''
          },
          items: (o.items || []).map(it => ({
            id: it.id,
            productId: it.variantId,
            name: `${it.productName}${it.variantName ? ` (${it.variantName})` : ''}`,
            price: Number(it.unitPrice || 0),
            quantity: Number(it.quantity || 1),
            image: it.productImageUrl
          })),
          voucherCode: o.note?.includes('Voucher:') ? o.note.split('Voucher:')[1]?.trim() : null,
          discountAmount: Number(o.discountAmount || 0),
          subtotal: Number(o.subtotal || 0),
          shippingFee: Number(o.shippingFee || 0),
          totalPayment: Number(o.totalAmount || 0),
          paymentMethod: o.paymentMethod || 'COD',
          rawStatus: o.status,
          deliveredAt: o.deliveredAt,
          cancellationReason: o.cancellationReason,
          timeline: o.timeline,
          buyerConfirmedDelivery: Boolean(o.buyerConfirmedDelivery),
          canConfirmDelivery: o.canConfirmDelivery !== undefined ? o.canConfirmDelivery : (!Boolean(o.buyerConfirmedDelivery) && (o.status === 'SHIPPED' || o.status === 'DELIVERED')),
          canCancel: o.canCancel !== undefined ? o.canCancel : (o.status === 'PENDING' || o.status === 'CONFIRMED'),
          canReturn: o.canReturn !== undefined ? o.canReturn : (Boolean(o.buyerConfirmedDelivery) && (o.status === 'DELIVERED' || o.status === 'delivered')),
          canReview: o.canReview !== undefined ? o.canReview : (Boolean(o.buyerConfirmedDelivery) && (o.status === 'DELIVERED' || o.status === 'delivered')),
          reviewConditionMessage: o.reviewConditionMessage,
          returnRequest: o.returnRequest,
          returnInstructions: o.returnInstructions
        }));

        setOrders(mapped);
        try {
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(mapped));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Could not fetch orders from API:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrdersFromApi();
  }, [fetchOrdersFromApi]);

  // Đồng bộ giỏ đơn hàng vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to sync orders:', e);
    }
  }, [orders]);

  // Tạo đơn hàng mới: Gửi trực tiếp lên Backend Database
  const createOrder = async (orderData) => {
    let createdBackendOrder = null;
    if (isAuthenticated) {
      // Chuyển đổi định dạng payload gửi về Backend
      const payload = {
        addressId: orderData.shippingAddress?.id || null,
        recipientName: orderData.shippingAddress?.fullName || orderData.shippingAddress?.recipientName || user?.fullName || 'Khách hàng',
        recipientPhone: orderData.shippingAddress?.phone || orderData.shippingAddress?.phoneNumber || '0362490374',
        shippingAddress: orderData.shippingAddress?.detailAddress 
          ? `${orderData.shippingAddress.detailAddress}${orderData.shippingAddress.ward ? `, ${orderData.shippingAddress.ward}` : ''}${orderData.shippingAddress.district ? `, ${orderData.shippingAddress.district}` : ''}${orderData.shippingAddress.city ? `, ${orderData.shippingAddress.city}` : ''}`
          : (typeof orderData.shippingAddress === 'string' ? orderData.shippingAddress : 'Địa chỉ giao hàng'),
        shopId: orderData.shopId || (orderData.items && orderData.items[0]?.shopId) || null,
        items: (orderData.items || []).map(it => ({
          variantId: it.variantId || (typeof it.id === 'number' ? it.id : null),
          productId: it.productId || null,
          productName: it.name,
          variantName: it.selectedStorage || it.selectedColor || 'Tiêu chuẩn',
          sku: it.sku || `SKU-${Date.now()}`,
          imageUrl: it.image,
          price: Number(it.price || 0),
          quantity: Number(it.quantity || 1),
          selectedColor: it.selectedColor,
          selectedStorage: it.selectedStorage
        })),
        voucherCode: orderData.voucherCode || null,
        discountAmount: Number(orderData.discountAmount || 0),
        shippingFee: Number(orderData.shippingFee || 0),
        subtotal: Number(orderData.subtotal || 0),
        totalAmount: Number(orderData.totalPayment || orderData.totalAmount || 0),
        paymentMethod: orderData.paymentMethod || 'COD',
        notes: orderData.notes || (orderData.voucherCode ? `Voucher: ${orderData.voucherCode}` : '')
      };

      const res = await orderApi.createOrder(payload);
      createdBackendOrder = res;
    }

    const newOrder = {
      ...orderData,
      id: createdBackendOrder?.orderCode || `CYBER-${Math.floor(10000 + Math.random() * 90000)}`,
      backendId: createdBackendOrder?.id || null,
      createdAt: createdBackendOrder?.createdAt || new Date().toISOString(),
      status: 'pending' // Luôn bắt đầu ở trạng thái "Chờ xác nhận"
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  // Cập nhật trạng thái đơn hàng
  const updateOrderStatus = async (orderId, newStatus) => {
    const target = orders.find(o => o.id === orderId);
    if (target?.backendId) {
      try {
        await orderApi.updateOrderStatus(target.backendId, { status: newStatus.toUpperCase() });
      } catch (err) {
        console.warn('Failed to update status on BE:', err);
      }
    }
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  // Hủy đơn hàng
  const cancelOrder = async (orderId, reason = '') => {
    const target = orders.find(o => o.id === orderId);
    if (target?.backendId) {
      try {
        await orderApi.cancelOrder(target.backendId, reason);
      } catch (err) {
        console.warn('Failed to cancel order on BE:', err);
      }
    }
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
    );
  };

  // Khách hàng xác nhận đã nhận hàng thành công
  const confirmDelivery = async (orderId) => {
    const target = orders.find(o => o.id === orderId || o.backendId === orderId);
    const targetId = target?.backendId || (typeof orderId === 'number' ? orderId : null);
    if (targetId) {
      try {
        await orderApi.confirmDelivery(targetId);
      } catch (err) {
        console.warn('Failed to confirm delivery on BE:', err);
        throw err;
      }
    }
    setOrders((prev) =>
      prev.map((order) =>
        (order.id === orderId || order.backendId === orderId)
          ? {
              ...order,
              status: 'delivered',
              rawStatus: 'DELIVERED',
              buyerConfirmedDelivery: true,
              canConfirmDelivery: false,
              canReview: true,
              canReturn: true,
              deliveredAt: new Date().toISOString()
            }
          : order
      )
    );
    fetchOrdersFromApi();
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        fetchOrdersFromApi,
        createOrder,
        updateOrderStatus,
        confirmDelivery,
        cancelOrder
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
