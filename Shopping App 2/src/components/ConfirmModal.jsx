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

  const renderIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return <Trash2 size={26} strokeWidth={2.2} />;
      case 'success':
        return <CheckCircle2 size={28} strokeWidth={2.2} />;
      case 'info':
        return <Info size={26} strokeWidth={2.2} />;
      case 'confirm':
      default:
        return <HelpCircle size={26} strokeWidth={2.2} />;
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
        className="cyber-modal-box"
        style={{ maxWidth: maxWidth || undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút X đóng góc phải */}
        <button
          type="button"
          className="cyber-modal-close-icon-btn"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Thân Modal */}
        <div className="cyber-modal-body">
          <div className={`cyber-modal-icon-wrap type-${type}`}>
            {renderIcon()}
          </div>

          {title && <h3 id="cyber-modal-title" className="cyber-modal-title">{title}</h3>}
          {message && <div className="cyber-modal-message">{message}</div>}

          {children && <div className="cyber-modal-custom-content">{children}</div>}
        </div>

        {/* Footer nút hành động */}
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
