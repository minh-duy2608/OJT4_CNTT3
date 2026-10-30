import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, Trash2, HelpCircle } from 'lucide-react';
import './ConfirmModal.css';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'confirm', // 'confirm' | 'danger' | 'success' | 'info'
  showCancel = true,
  icon = null,
  children = null,
  maxWidth = null
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = (customSize) => {
    const size = customSize || (maxWidth ? 20 : 26);
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return <Trash2 size={size} strokeWidth={2.2} />;
      case 'success':
        return <CheckCircle2 size={size} strokeWidth={2.2} />;
      case 'info':
        return <Info size={size} strokeWidth={2.2} />;
      case 'confirm':
      default:
        return <HelpCircle size={size} strokeWidth={2.2} />;
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  return (
    <div
      className="cyber-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cyber-modal-title"
    >
      <div
        className={`cyber-modal-box ${maxWidth ? 'is-wide' : ''}`}
        style={{ maxWidth: maxWidth || undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút X hoặc Header ghim ở trên cùng */}
        {maxWidth ? (
          <div className="cyber-modal-header-compact">
            <div className="cyber-modal-header-left">
              <div className={`cyber-modal-icon-wrap-compact type-${type}`}>
                {renderIcon(18)}
              </div>
              <div style={{ minWidth: 0 }}>
                {title && <h3 id="cyber-modal-title" className="cyber-modal-title-compact">{title}</h3>}
                {message && <div className="cyber-modal-message-compact">{message}</div>}
              </div>
            </div>
            <button
              type="button"
              className="cyber-modal-close-icon-btn-static"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="cyber-modal-close-icon-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        )}

        {/* Thân Modal cuộn mượt mà */}
        <div className="cyber-modal-body">
          {!maxWidth && (
            <>
              <div className={`cyber-modal-icon-wrap type-${type}`}>
                {renderIcon()}
              </div>
              {title && <h3 id="cyber-modal-title" className="cyber-modal-title">{title}</h3>}
              {message && <div className="cyber-modal-message">{message}</div>}
            </>
          )}

          {children && <div className="cyber-modal-custom-content">{children}</div>}
        </div>

        {/* Footer nút hành động luôn ghim ở dưới */}
        <div className="cyber-modal-footer">
          {showCancel && (
            <button
              type="button"
              className="cyber-modal-btn btn-cancel"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}

          {onConfirm && (
            <button
              type="button"
              className={`cyber-modal-btn ${getConfirmBtnClass()}`}
              onClick={() => {
                onConfirm();
              }}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
