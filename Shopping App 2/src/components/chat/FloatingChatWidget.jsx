import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Minus, Send, MessageCircle, ExternalLink,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import './FloatingChatWidget.css';

/* ─── Helpers ─── */
const formatTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatVND = (n) =>
  Number(n).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const QUICK_REPLIES = [
  'Sản phẩm còn hàng không shop?',
  'Cho mình tư vấn thêm nhé!',
  'Ship nhanh không shop ơi?',
];

/* ─── Component chính ─── */
export const FloatingChatWidget = () => {
  const { user } = useAuth();
  const {
    isChatOpen, isMinimized, activeSeller, productContext,
    messages, connected,
    closeChat, toggleMinimize,
    sendMessage, markAsRead, addLocalMessage,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const isSendingRef = useRef(false);

  /* Cuộn xuống tin mới nhất */
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen, isMinimized]);

  /* Đánh dấu đã đọc khi mở chat */
  useEffect(() => {
    if (isChatOpen && !isMinimized && messages.length > 0 && user?.id) {
      const roomId = messages[0]?.roomId;
      if (roomId && roomId !== activeRoomIdRef.current) {
        activeRoomIdRef.current = roomId;
        markAsRead(roomId, user.id);
      }
    }
  }, [isChatOpen, isMinimized, messages, user?.id, markAsRead]);

  /* Focus input khi mở */
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isChatOpen, isMinimized]);

  /* ─── Gửi tin nhắn văn bản ─── */
  const handleSend = useCallback((text) => {
    if (isSendingRef.current) return;
    const content = (text ?? inputText).trim();
    if (!content || !user?.id || !activeSeller?.id) return;

    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 350);

    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientMsgId,
      senderId: user.id,
      receiverId: activeSeller.id,
      content,
      messageType: 'TEXT',
    };

    // Optimistic update có kèm clientMsgId để thay thế khi WS trả về
    addLocalMessage({
      ...payload,
      id: null,
      roomId: activeRoomIdRef.current || null,
      senderName: user.name || user.fullName,
      senderAvatar: user.avatar,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    sendMessage(payload);
    setInputText('');
  }, [inputText, user, activeSeller, sendMessage, addLocalMessage]);

  /* ─── Gửi thẻ sản phẩm ─── */
  const handleSendProduct = useCallback(() => {
    if (isSendingRef.current) return;
    if (!productContext || !user?.id || !activeSeller?.id) return;

    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 350);

    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientMsgId,
      senderId: user.id,
      receiverId: activeSeller.id,
      content: `Hỏi về sản phẩm: ${productContext.name}`,
      messageType: 'PRODUCT_CARD',
      productId: productContext.id,
      productName: productContext.name,
      productImage: productContext.image,
      productPrice: productContext.price,
    };

    addLocalMessage({
      ...payload,
      id: null,
      roomId: activeRoomIdRef.current || null,
      senderName: user.name || user.fullName,
      senderAvatar: user.avatar,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    sendMessage(payload);
  }, [productContext, user, activeSeller, sendMessage, addLocalMessage]);

  /* ─── Enter để gửi ─── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.repeat) return;
      handleSend();
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className={`fcw-wrapper ${isMinimized ? 'fcw-minimized' : ''}`}>
      {/* ─── HEADER ─── */}
      <div className="fcw-header" onClick={isMinimized ? toggleMinimize : undefined}>
        <div className="fcw-header-left">
          <div className="fcw-avatar-wrap">
            {activeSeller?.avatar ? (
              <img src={activeSeller.avatar} alt={activeSeller.name} className="fcw-seller-avatar" />
            ) : (
              <div className="fcw-seller-avatar fcw-avatar-placeholder">
                {(activeSeller?.name || 'S')[0].toUpperCase()}
              </div>
            )}
            <span className={`fcw-status-dot ${connected ? 'online' : 'offline'}`} />
          </div>
          <div className="fcw-header-info">
            <span className="fcw-seller-name">{activeSeller?.name || 'Người bán'}</span>
            <span className="fcw-seller-status">
              {connected ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          </div>
        </div>
        <div className="fcw-header-actions">
          <button className="fcw-icon-btn" onClick={(e) => { e.stopPropagation(); toggleMinimize(); }} title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}>
            <Minus size={16} />
          </button>
          <button className="fcw-icon-btn" onClick={(e) => { e.stopPropagation(); closeChat(); }} title="Đóng chat">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ─── PRODUCT CONTEXT BANNER ─── */}
          {productContext && (
            <div className="fcw-product-banner">
              <img
                src={productContext.image}
                alt={productContext.name}
                className="fcw-product-thumb"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="fcw-product-info">
                <span className="fcw-product-name">{productContext.name}</span>
                <span className="fcw-product-price">{formatVND(productContext.price)}</span>
              </div>
              <button className="fcw-send-product-btn" onClick={handleSendProduct} title="Gửi thẻ sản phẩm vào chat">
                Gửi sản phẩm
              </button>
            </div>
          )}

          {/* ─── MESSAGES AREA ─── */}
          <div className="fcw-messages">
            {messages.length === 0 && (
              <div className="fcw-empty-state">
                <MessageCircle size={36} className="fcw-empty-icon" />
                <p>Bắt đầu cuộc trò chuyện với {activeSeller?.name || 'người bán'}!</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMe = String(msg.senderId) === String(user?.id);
              const isLast = idx === messages.length - 1;

              return (
                <div key={msg.id ?? idx} className={`fcw-msg-row ${isMe ? 'me' : 'them'}`}>
                  {/* Avatar đối phương */}
                  {!isMe && (
                    <div className="fcw-msg-avatar">
                      {activeSeller?.avatar ? (
                        <img src={activeSeller.avatar} alt="" />
                      ) : (
                        <span>{(activeSeller?.name || 'S')[0]}</span>
                      )}
                    </div>
                  )}

                  <div className="fcw-msg-content">
                    {/* Bubble tin nhắn */}
                    {msg.messageType === 'PRODUCT_CARD' ? (
                      <div className={`fcw-bubble fcw-product-card ${isMe ? 'me' : 'them'}`}>
                        <span className="fcw-product-card-label">🛍️ Sản phẩm đang hỏi</span>
                        <div className="fcw-product-card-body">
                          {msg.productImage && (
                            <img src={msg.productImage} alt={msg.productName} className="fcw-product-card-img" />
                          )}
                          <div className="fcw-product-card-info">
                            <span className="fcw-product-card-name">{msg.productName}</span>
                            {msg.productPrice && (
                              <span className="fcw-product-card-price">{formatVND(msg.productPrice)}</span>
                            )}
                            {msg.productId && (
                              <Link
                                to={`/products/${msg.productId}`}
                                className="fcw-product-card-link"
                                target="_blank"
                              >
                                Xem sản phẩm <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`fcw-bubble ${isMe ? 'me' : 'them'}`}>
                        {msg.content}
                      </div>
                    )}

                    {/* Thời gian & trạng thái đã xem */}
                    <div className={`fcw-msg-meta ${isMe ? 'me' : 'them'}`}>
                      <span className="fcw-msg-time">{formatTime(msg.createdAt)}</span>
                      {isMe && isLast && msg.isRead && (
                        <span className="fcw-read-label">Đã xem</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── QUICK REPLIES ─── */}
          <div className="fcw-quick-replies">
            {QUICK_REPLIES.map((qr) => (
              <button key={qr} type="button" className="fcw-qr-chip" onClick={() => handleSend(qr)}>
                {qr}
              </button>
            ))}
          </div>

          {/* ─── INPUT ─── */}
          <div className="fcw-input-row">
            <textarea
              ref={inputRef}
              className="fcw-input"
              placeholder="Nhập tin nhắn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              className="fcw-send-btn"
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              title="Gửi (Enter)"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

