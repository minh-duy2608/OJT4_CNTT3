import React, {
  createContext, useContext, useCallback,
  useEffect, useRef, useState,
} from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import { chatApi } from '../services/chatApi';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  /* ─── Trạng thái UI cửa sổ chat nổi ─── */
  const [isChatOpen, setIsChatOpen]       = useState(false);
  const [isMinimized, setIsMinimized]     = useState(false);
  const [activeSeller, setActiveSeller]   = useState(null);  // { id, name, avatar, email }
  const [productContext, setProductContext] = useState(null); // { id, name, image, price }

  /* ─── Tin nhắn & Trạng thái chưa đọc ─── */
  const [messages, setMessages]           = useState([]);    // lịch sử tin nhắn active room
  const [totalUnread, setTotalUnread]     = useState(0);
  const [connected, setConnected]         = useState(false);

  /* ─── STOMP client ─── */
  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);

  /* ─── Kết nối WebSocket khi user đăng nhập ─── */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      disconnectWS();
      return;
    }

    const token =
      localStorage.getItem('CYBER_ACCESS_TOKEN') ||
      sessionStorage.getItem('CYBER_ACCESS_TOKEN') || '';

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${window.location.protocol}//${window.location.host}/ws-chat`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        // Subscribe kênh nhận tin nhắn của chính mình
        subscriptionRef.current = client.subscribe(
          `/topic/messages.${user.id}`,
          (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              setMessages((prev) => {
                // Chỉ thêm vào messages nếu thuộc active room
                const isActive =
                  (msg.senderId === user.id || msg.receiverId === user.id);
                return isActive ? [...prev, msg] : prev;
              });
              // Tăng badge chưa đọc nếu khung chat không focus
              if (!isChatOpen || isMinimized) {
                setTotalUnread((n) => n + 1);
              }
            } catch {}
          }
        );
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => console.warn('STOMP error', frame),
    });

    client.activate();
    stompClientRef.current = client;

    // Lấy badge chưa đọc ban đầu
    chatApi.getUnreadCount(user.id)
      .then((data) => setTotalUnread(data?.unreadCount ?? 0))
      .catch(() => {});

    return () => { disconnectWS(); };
  }, [isAuthenticated, user?.id]);

  const disconnectWS = () => {
    subscriptionRef.current?.unsubscribe();
    stompClientRef.current?.deactivate();
    stompClientRef.current = null;
    setConnected(false);
  };

  /* ─── Gửi tin nhắn qua WebSocket ─── */
  const sendMessage = useCallback((payload) => {
    if (!stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }, []);

  /* ─── Đánh dấu đã đọc qua WebSocket ─── */
  const markAsRead = useCallback((roomId, readerId) => {
    if (!stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({ roomId, readerId }),
    });
    setTotalUnread(0);
  }, []);

  /* ─── Mở chat với người bán ─── */
  const openChatWithSeller = useCallback(async (sellerInfo, product = null) => {
    if (!isAuthenticated || !user?.id) return;
    setActiveSeller(sellerInfo);
    setProductContext(product);
    setIsMinimized(false);
    setIsChatOpen(true);

    // Load lịch sử tin nhắn
    try {
      const history = await chatApi.getHistory(user.id, sellerInfo.id);
      setMessages(Array.isArray(history) ? history : []);
    } catch {
      setMessages([]);
    }
  }, [isAuthenticated, user?.id]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setActiveSeller(null);
    setProductContext(null);
    setMessages([]);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((v) => !v);
  }, []);

  /* ─── Thêm tin nhắn local (optimistic update khi gửi) ─── */
  const addLocalMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <ChatContext.Provider value={{
      isChatOpen, isMinimized, activeSeller, productContext,
      messages, totalUnread, connected,
      openChatWithSeller, closeChat, toggleMinimize,
      sendMessage, markAsRead, addLocalMessage,
      setMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

