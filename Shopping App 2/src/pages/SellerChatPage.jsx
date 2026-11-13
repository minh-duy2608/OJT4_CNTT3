import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle, Search, Send, ExternalLink, CheckCheck, Check,
  Store, User, Clock, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chatApi } from '../services/chatApi';
import { formatVND } from '../data/products';
import './SellerChatPage.css';

const SELLER_QUICK_REPLIES = [
  'Dạ chào bạn, shop có thể hỗ trợ gì cho bạn ạ?',
  'Sản phẩm này hiện đang sẵn hàng tại kho bạn nhé!',
  'Bạn cần tư vấn thêm về màu sắc hay dung lượng không ạ?',
  'Shop sẽ đóng gói và bàn giao vận chuyển ngay hôm nay ạ!'
];

export const SellerChatPage = ({ embedded = false }) => {
  const { user } = useAuth();
  const {
    messages, connected, sendMessage, markAsRead, addLocalMessage, setMessages
  } = useChat();

  const [rooms, setRooms] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);

  // 1. Tải danh sách phòng chat của người dùng hiện tại
  const fetchRooms = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await chatApi.getRooms(user.id);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Lỗi tải danh sách phòng chat:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // 2. Lắng nghe tin nhắn mới từ WebSocket qua ChatContext để cập nhật danh sách phòng
  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      if (!latestMsg) return;

      // Cập nhật tin nhắn trong phòng đang mở (loại bỏ trùng lặp triệt để)
      if (selectedPartner && (latestMsg.senderId === selectedPartner.id || latestMsg.receiverId === selectedPartner.id)) {
        setRoomMessages((prev) => {
          // a. Trùng lặp theo DB id
          if (latestMsg.id && prev.some((m) => m.id === latestMsg.id)) return prev;

          // b. Trùng lặp theo clientMsgId -> thay thế tin nhắn tạm
          if (latestMsg.clientMsgId && prev.some((m) => m.clientMsgId === latestMsg.clientMsgId)) {
            return prev.map((m) => (m.clientMsgId === latestMsg.clientMsgId ? latestMsg : m));
          }

          // c. Trùng lặp tin nhắn tạm cùng người gửi và nội dung
          const localIdx = prev.findIndex(
            (m) =>
              !m.id &&
              m.senderId === latestMsg.senderId &&
              m.receiverId === latestMsg.receiverId &&
              m.content === latestMsg.content
          );
          if (localIdx !== -1) {
            const next = [...prev];
            next[localIdx] = latestMsg;
            return next;
          }

          return [...prev, latestMsg];
        });
      }

      // Cập nhật lại danh sách phòng
      fetchRooms();
    }
  }, [messages, selectedPartner, fetchRooms]);

  // 3. Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // 4. Chọn một khách hàng / đối phương để trò chuyện
  const handleSelectRoom = async (room) => {
    const partner = {
      id: room.partnerId,
      name: room.partnerName,
      avatar: room.partnerAvatar,
      email: room.partnerEmail
    };
    setSelectedPartner(partner);
    setActiveRoomId(room.roomId);
    setIsLoadingHistory(true);

    try {
      const history = await chatApi.getHistory(user.id, partner.id);
      const list = Array.isArray(history) ? history : [];
      // Khử trùng lặp theo id khi tải từ server
      const map = new Map();
      list.forEach((m) => {
        if (m.id) map.set(m.id, m);
      });
      setRoomMessages(Array.from(map.values()));

      // Đánh dấu đã đọc
      if (room.roomId && user?.id) {
        markAsRead(room.roomId, user.id);
        // Cập nhật ngay unread trên UI phòng
        setRooms((prev) =>
          prev.map((r) => (r.roomId === room.roomId ? { ...r, unreadCount: 0 } : r))
        );
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử chat:', err);
      setRoomMessages([]);
    } finally {
      setIsLoadingHistory(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 5. Gửi tin nhắn phản hồi
  const handleSendMessage = (textToSend) => {
    if (isSendingRef.current) return;
    const content = (textToSend ?? inputText).trim();
    if (!content || !user?.id || !selectedPartner?.id) return;

    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 350);

    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientMsgId,
      senderId: user.id,
      receiverId: selectedPartner.id,
      content,
      messageType: 'TEXT'
    };

    const localMsg = {
      ...payload,
      id: null,
      roomId: activeRoomId,
      senderName: user.name || user.fullName,
      senderAvatar: user.avatar,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    setRoomMessages((prev) => [...prev, localMsg]);
    sendMessage(payload);
    setInputText('');

    // Đưa phòng chat này lên đầu danh sách
    setRooms((prev) => {
      const existing = prev.find((r) => r.partnerId === selectedPartner.id);
      if (existing) {
        return [
          { ...existing, lastMessage: content, lastMessageTime: new Date().toISOString() },
          ...prev.filter((r) => r.partnerId !== selectedPartner.id)
        ];
      }
      return prev;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.repeat) return;
      handleSendMessage();
    }
  };

  // Lọc phòng chat theo từ khóa tìm kiếm
  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        (r.partnerName && r.partnerName.toLowerCase().includes(q)) ||
        (r.lastMessage && r.lastMessage.toLowerCase().includes(q))
    );
  }, [rooms, searchTerm]);

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className={`seller-chat-container ${embedded ? 'is-embedded' : ''}`}>
      {/* ─── CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI ─── */}
      <aside className="seller-chat-sidebar">
        <div className="seller-chat-sidebar-header">
          <div className="sidebar-header-title">
            <MessageCircle size={22} className="chat-title-icon" />
            <h2>Hộp thư khách hàng</h2>
          </div>
          <div className="sidebar-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm khách hàng hoặc tin nhắn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="seller-chat-rooms-list">
          {isLoadingRooms ? (
            <div className="chat-rooms-loading">
              <div className="chat-spinner" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="chat-rooms-empty">
              <MessageCircle size={32} opacity={0.3} />
              <p>{searchTerm ? 'Không tìm thấy cuộc trò chuyện phù hợp' : 'Chưa có cuộc trò chuyện nào'}</p>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isSelected = selectedPartner?.id === room.partnerId;
              const hasUnread = room.unreadCount > 0;

              return (
                <div
                  key={room.roomId}
                  className={`chat-room-item ${isSelected ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`}
                  onClick={() => handleSelectRoom(room)}
                >
                  <div className="room-avatar-wrapper">
                    {room.partnerAvatar ? (
                      <img src={room.partnerAvatar} alt={room.partnerName} className="room-avatar" />
                    ) : (
                      <div className="room-avatar-placeholder">
                        {(room.partnerName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="online-indicator" />
                  </div>

                  <div className="room-body">
                    <div className="room-header-row">
                      <span className="room-name">{room.partnerName || 'Khách hàng'}</span>
                      <span className="room-time">{formatMessageTime(room.lastMessageTime)}</span>
                    </div>
                    <div className="room-snippet-row">
                      <span className="room-snippet">{room.lastMessage || 'Chưa có tin nhắn'}</span>
                      {hasUnread && (
                        <span className="room-unread-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── CỘT PHẢI: KHUNG TRÒ CHUYỆN CHI TIẾT ─── */}
      <main className="seller-chat-main">
        {selectedPartner ? (
          <>
            {/* Header phòng chat đang chọn */}
            <div className="chat-main-header">
              <div className="chat-partner-profile">
                {selectedPartner.avatar ? (
                  <img src={selectedPartner.avatar} alt={selectedPartner.name} className="partner-header-avatar" />
                ) : (
                  <div className="partner-header-placeholder">
                    {(selectedPartner.name || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="partner-header-info">
                  <div className="partner-header-name">
                    <span>{selectedPartner.name}</span>
                    <span className="online-badge-dot" />
                  </div>
                  <span className="partner-header-status">
                    {connected ? 'Thời gian thực (Online)' : 'Ngoại tuyến'}
                    {selectedPartner.email && ` • ${selectedPartner.email}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Vùng tin nhắn */}
            <div className="chat-main-messages">
              {isLoadingHistory ? (
                <div className="chat-messages-loading">
                  <div className="chat-spinner" />
                  <span>Đang tải lịch sử trò chuyện...</span>
                </div>
              ) : roomMessages.length === 0 ? (
                <div className="chat-messages-empty">
                  <MessageCircle size={44} opacity={0.3} />
                  <p>Hãy gửi lời chào đầu tiên tới {selectedPartner.name}!</p>
                </div>
              ) : (
                roomMessages.map((msg, idx) => {
                  const isMe = String(msg.senderId) === String(user?.id);
                  const isLast = idx === roomMessages.length - 1;

                  return (
                    <div key={msg.id ?? idx} className={`chat-bubble-row ${isMe ? 'is-me' : 'is-partner'}`}>
                      {!isMe && (
                        <div className="chat-bubble-avatar">
                          {selectedPartner.avatar ? (
                            <img src={selectedPartner.avatar} alt="" />
                          ) : (
                            <span>{(selectedPartner.name || 'U')[0]}</span>
                          )}
                        </div>
                      )}

                      <div className="chat-bubble-container">
                        {msg.messageType === 'PRODUCT_CARD' ? (
                          <div className={`chat-bubble product-card-bubble ${isMe ? 'is-me' : 'is-partner'}`}>
                            <div className="product-card-badge">🛍️ Sản phẩm khách đang hỏi</div>
                            <div className="product-card-main">
                              {msg.productImage && (
                                <img src={msg.productImage} alt={msg.productName} className="product-card-img" />
                              )}
                              <div className="product-card-details">
                                <h4 className="product-card-title">{msg.productName}</h4>
                                {msg.productPrice && (
                                  <div className="product-card-price">{formatVND(msg.productPrice)}</div>
                                )}
                                {msg.productId && (
                                  <Link
                                    to={`/products/${msg.productId}`}
                                    target="_blank"
                                    className="product-card-view-btn"
                                  >
                                    Xem chi tiết sản phẩm <ExternalLink size={12} />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`chat-bubble text-bubble ${isMe ? 'is-me' : 'is-partner'}`}>
                            {msg.content}
                          </div>
                        )}

                        <div className={`chat-bubble-meta ${isMe ? 'is-me' : 'is-partner'}`}>
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isMe && isLast && msg.isRead && (
                            <span className="msg-read-status">
                              <CheckCheck size={13} /> Đã xem
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Gợi ý câu trả lời nhanh cho Người bán */}
            <div className="seller-quick-replies-bar">
              <span className="qr-title">Trả lời nhanh:</span>
              <div className="qr-chips-scroll">
                {SELLER_QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    className="qr-chip-btn"
                    onClick={() => handleSendMessage(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập tin nhắn */}
            <div className="chat-main-input-bar">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={`Nhắn tin cho ${selectedPartner.name}... (Nhấn Enter để gửi)`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="chat-send-action-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="chat-no-selection">
            <div className="no-selection-illustration">
              <MessageCircle size={56} className="no-selection-icon" />
              <h3>Chọn một cuộc hội thoại</h3>
              <p>Chọn khách hàng từ danh sách bên trái để xem lịch sử và trao đổi trực tiếp thời gian thực.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SellerChatPage;

