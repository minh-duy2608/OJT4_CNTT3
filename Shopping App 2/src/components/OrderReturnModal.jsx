import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Truck,
  Trash2
} from 'lucide-react';
import { formatVND } from '../data/products';
import { returnApi } from '../services/returnApi';
import { productApi } from '../services/productApi';

const DEFAULT_RETURN_REASONS = [
  'Hàng bị bể vỡ / móp méo do vận chuyển',
  'Hàng bị lỗi kỹ thuật / không hoạt động được',
  'Giao sai sản phẩm / sai mẫu mã / sai màu sắc',
  'Sản phẩm khác biệt nhiều so với hình ảnh / mô tả',
  'Thiếu phụ kiện / quà tặng kèm theo',
  'Lý do khác'
];

export const OrderReturnModal = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState(DEFAULT_RETURN_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnMethod, setReturnMethod] = useState('POST_OFFICE');
  const [evidenceFiles, setEvidenceFiles] = useState([]); // [{ url, type, name }]
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !order) return null;

  const totalRefundAmount = order.totalPayment || order.totalAmount || order.subtotal || 0;

  // Xử lý tải ảnh hoặc video minh chứng
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      const uploaded = [];
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        try {
          const res = await productApi.uploadImage(file);
          const fileUrl = res?.url || res?.fileUrl || (typeof res === 'string' ? res : null);
          if (fileUrl) {
            uploaded.push({
              url: fileUrl,
              type: isVideo ? 'video' : 'image',
              name: file.name
            });
          } else {
            throw new Error('Không nhận được đường dẫn tệp');
          }
        } catch {
          // Fallback to local Data URL preview
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = (readEvent) => {
              uploaded.push({
                url: readEvent.target.result,
                type: isVideo ? 'video' : 'image',
                name: file.name
              });
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      }

      setEvidenceFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setErrorMsg('Không thể tải tệp lên: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveEvidence = (indexToRemove) => {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const finalReason = selectedReason === 'Lý do khác' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setErrorMsg('Vui lòng chọn hoặc nhập lý do yêu cầu trả hàng / hoàn tiền.');
      return;
    }

    try {
      setIsSubmitting(true);
      const evidenceUrls = evidenceFiles.map((f) => f.url);

      const payload = {
        reason: finalReason,
        note: returnNote.trim(),
        requestedAmount: totalRefundAmount,
        returnMethod: 'POST_OFFICE',
        evidenceUrls: evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : ''
      };

      await returnApi.requestReturn(order.id, payload);

      if (onSuccess) {
        onSuccess(order);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi gửi yêu cầu trả hàng. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="order-return-modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div 
        className="order-return-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fff1f2, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Yêu cầu Hoàn hàng & Trả tiền
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Đơn hàng #{order.id} • {order.shopName ? `Shop: ${order.shopName}` : 'Hệ thống Cyber'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}>
          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Lý do hoàn hàng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              1. Chọn lý do hoàn hàng <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              {DEFAULT_RETURN_REASONS.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>

            {/* Nhập lý do khác nếu chọn mục cuối */}
            {selectedReason === 'Lý do khác' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Vui lòng nhập chi tiết lý do của bạn..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #dc2626',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* 2. Chi tiết mô tả lỗi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              2. Mô tả chi tiết vấn đề (Tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder="Ghi rõ tình trạng sản phẩm gặp phải khi bạn nhận và mở hộp..."
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 3. Tải lên ảnh / video minh chứng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              3. Bằng chứng hình ảnh / video sản phẩm bị lỗi
            </label>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('evidence-file-input')?.click()}
            >
              <input
                id="evidence-file-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Upload size={24} color="#64748b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  {isUploading ? 'Đang tải tệp lên...' : 'Nhấn để chọn ảnh hoặc video từ thiết bị'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Hỗ trợ định dạng JPG, PNG, MP4, MOV (Tối đa 5 tệp)
                </span>
              </div>
            </div>

            {/* Danh sách ảnh/video preview */}
            {evidenceFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {evidenceFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f1f5f9'
                    }}
                  >
                    {file.type === 'video' ? (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '0.7rem'
                      }}>
                        <Film size={24} color="#dc2626" />
                        <span>Video</span>
                      </div>
                    ) : (
                      <img 
                        src={file.url} 
                        alt="Evidence" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveEvidence(idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Xóa tệp này"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Phương thức gửi hàng hoàn lại */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              4. Phương thức hoàn trả hàng
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Option 1: Trả tại bưu cục (Được chọn) */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #2563eb',
                  backgroundColor: '#eff6ff',
                  cursor: 'pointer'
                }}
                onClick={() => setReturnMethod('POST_OFFICE')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input
                    type="radio"
                    name="returnMethod"
                    value="POST_OFFICE"
                    checked={returnMethod === 'POST_OFFICE'}
                    onChange={() => setReturnMethod('POST_OFFICE')}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="#2563eb" />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af' }}>
                      Trả hàng tại bưu cục (Khuyên dùng)
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.785rem', color: '#475569', lineHeight: 1.4 }}>
                    Sau khi Shop duyệt đơn, bạn mang gói hàng đến bất kỳ điểm bưu cục Viettel Post / VNPost / GHN gần nhất để gửi trả lại Shop.
                  </p>
                </div>
              </div>

              {/* Option 2: Shipper đến lấy (Chưa khả dụng) */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  opacity: 0.65,
                  cursor: 'not-allowed'
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  <input
                    type="radio"
                    name="returnMethod"
                    value="SHIPPER_PICKUP"
                    disabled
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={16} color="#64748b" />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#64748b' }}>
                      Shipper đến lấy hàng tận nhà
                    </span>
                    <span style={{
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      Đang phát triển
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.785rem', color: '#94a3b8' }}>
                    Tính năng điều phối Shipper lấy hàng tận nhà đang được cập nhật và chưa khả dụng.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Số tiền dự kiến hoàn */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '12px 14px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                Số tiền dự kiến hoàn trả:
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                (Hoàn lại sau khi shop nhận được kiện hàng gửi về)
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
              {formatVND(totalRefundAmount)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};
