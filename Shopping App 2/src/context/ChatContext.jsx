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

  /* ─── STOMP client & Subscriptions refs ─── */
  const stompClientRef = useRef(null);
  const messageSubRef = useRef(null);
  const readSubRef = useRef(null);
  const isConnectingRef = useRef(false);

  /* ─── Ngắt kết nối sạch sẽ ─── */
  const disconnectWS = useCallback(() => {
    if (messageSubRef.current) {
      try { messageSubRef.current.unsubscribe(); } catch {}
      messageSubRef.current = null;
    }
    if (readSubRef.current) {
      try { readSubRef.current.unsubscribe(); } catch {}
      readSubRef.current = null;
    }
    if (stompClientRef.current) {
      try { stompClientRef.current.deactivate(); } catch {}
      stompClientRef.current = null;
    }
    isConnectingRef.current = false;
    setConnected(false);
  }, []);

  /* ─── Kết nối WebSocket khi user đăng nhập ─── */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      disconnectWS();
      return;
    }

    // Đảm bảo dọn sạch kết nối cũ trước khi mở kết nối mới
    disconnectWS();
    isConnectingRef.current = true;

    const token =
      localStorage.getItem('CYBER_ACCESS_TOKEN') ||
      sessionStorage.getItem('CYBER_ACCESS_TOKEN') || '';

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${window.location.protocol}//${window.location.host}/ws-chat`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        isConnectingRef.current = false;
        setConnected(true);

        // Hủy subscription cũ nếu còn sót
        if (messageSubRef.current) {
          try { messageSubRef.current.unsubscribe(); } catch {}
          messageSubRef.current = null;
        }
        if (readSubRef.current) {
          try { readSubRef.current.unsubscribe(); } catch {}
          readSubRef.current = null;
        }

        // 1. Subscribe kênh nhận tin nhắn của chính mình
        messageSubRef.current = client.subscribe(
          `/topic/messages.${user.id}`,
          (frame) => {
            try {
              const incoming = JSON.parse(frame.body);
              if (!incoming) return;

              setMessages((prev) => {
                // a. Nếu đã tồn tại tin nhắn cùng id (từ DB) -> bỏ qua
                if (incoming.id && prev.some((m) => m.id === incoming.id)) {
                  return prev;
                }

                // b. Nếu có clientMsgId, thay thế tin nhắn tạm (optimistic) có cùng clientMsgId
                if (incoming.clientMsgId && prev.some((m) => m.clientMsgId === incoming.clientMsgId)) {
                  return prev.map((m) => (m.clientMsgId === incoming.clientMsgId ? incoming : m));
                }

                // c. Nếu có tin nhắn tạm (chưa có id DB) cùng sender, receiver, content -> thay thế
                const localIdx = prev.findIndex(
                  (m) =>
                    !m.id &&
                    m.senderId === incoming.senderId &&
                    m.receiverId === incoming.receiverId &&
                    m.content === incoming.content
                );
                if (localIdx !== -1) {
                  const next = [...prev];
                  next[localIdx] = incoming;
                  return next;
                }

                return [...prev, incoming];
              });

              // Tăng badge nếu không focus cửa sổ chat
              if (!isChatOpen || isMinimized) {
                setTotalUnread((n) => n + 1);
              }
            } catch (err) {
              console.warn('Lỗi phân tích tin nhắn WebSocket:', err);
            }
          }
        );

        // 2. Subscribe sự kiện "Đã xem" từ đối phương
        readSubRef.current = client.subscribe(
          `/topic/read.${user.id}`,
          (frame) => {
            try {
              const event = JSON.parse(frame.body);
              if (event?.roomId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.roomId === event.roomId || !m.roomId
                      ? { ...m, isRead: true }
                      : m
                  )
                );
              }
            } catch {}
          }
        );
      },
      onDisconnect: () => {
        setConnected(false);
        isConnectingRef.current = false;
      },
      onStompError: (frame) => {
        console.warn('STOMP protocol error:', frame);
        setConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    // Lấy số tin chưa đọc ban đầu
    chatApi.getUnreadCount(user.id)
      .then((data) => setTotalUnread(data?.unreadCount ?? 0))
      .catch(() => {});

    // Cleanup khi component unmount hoặc user thay đổi (chống StrictMode tạo 2 kết nối)
    return () => {
      disconnectWS();
    };
  }, [isAuthenticated, user?.id, disconnectWS]);

  /* ─── Gửi tin nhắn qua WebSocket STOMP ─── */
  const sendMessage = useCallback((payload) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn('WebSocket chưa kết nối, không thể gửi tin nhắn.');
      return;
    }
    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }, []);

  /* ─── Đánh dấu đã đọc qua WebSocket STOMP ─── */
  const markAsRead = useCallback((roomId, readerId) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return;
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

    // Tải lịch sử tin nhắn & loại bỏ trùng lặp theo id
    try {
      const history = await chatApi.getHistory(user.id, sellerInfo.id);
      const list = Array.isArray(history) ? history : [];
      const map = new Map();
      list.forEach((m) => {
        if (m.id) map.set(m.id, m);
      });
      setMessages(Array.from(map.values()));
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

  /* ─── Thêm tin nhắn local (Optimistic UI có kiểm tra trùng lặp) ─── */
  const addLocalMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (msg.clientMsgId && prev.some((m) => m.clientMsgId === msg.clientMsgId)) {
        return prev;
      }
      if (msg.id && prev.some((m) => m.id === msg.id)) {
        return prev;
      }
      return [...prev, msg];
    });
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
