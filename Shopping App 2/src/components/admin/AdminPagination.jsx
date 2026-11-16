import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminPagination = ({
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  pageSize = 10,
  itemName = 'mục',
  onPageChange,
  disabled = false,
  showWhenSinglePage = true
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeTotalElements = totalElements || 0;

  if (!showWhenSinglePage && safeTotalPages <= 1 && safeTotalElements <= pageSize) {
    return null;
  }

  const startItem = safeTotalElements === 0 ? 0 : currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, safeTotalElements);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination-info">
        {safeTotalElements > 0 ? (
          <>
            Hiển thị <strong>{startItem} - {endItem}</strong> trong số <strong>{safeTotalElements}</strong> {itemName}
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
            Trang <strong>{currentPage + 1}</strong> / <strong>{safeTotalPages}</strong>
          </>
        ) : (
          <>Trang <strong>1</strong> / <strong>1</strong> (0 {itemName})</>
        )}
      </div>

      <div className="admin-pagination-btns">
        <button
          type="button"
          className="admin-page-btn"
          disabled={disabled || currentPage <= 0}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
          Trước
        </button>

        {Array.from({ length: Math.min(5, safeTotalPages) }, (_, idx) => {
          let pNum = idx;
          if (safeTotalPages > 5 && currentPage > 2) {
            pNum = Math.min(safeTotalPages - 5, currentPage - 2) + idx;
          }
          return (
            <button
              key={pNum}
              type="button"
              className={`admin-page-btn ${currentPage === pNum ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => onPageChange(pNum)}
            >
              {pNum + 1}
            </button>
          );
        })}

        <button
          type="button"
          className="admin-page-btn"
          disabled={disabled || currentPage >= safeTotalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          Sau
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

