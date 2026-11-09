import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Cpu, HardDrive, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { systemApi } from '../../services/systemApi';

export const AdminSystemHealthCard = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await systemApi.getAdminHealth();
      setHealth(res);
    } catch (err) {
      console.error('Lỗi kiểm tra sức khỏe hệ thống', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (!health && !loading) return null;

  const formatUptime = (seconds = 0) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color={health?.status === 'UP' ? '#059669' : '#ea580c'} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Tình trạng Vận hành Hệ thống & Máy chủ (System Health)
          </h3>
          <span style={{ background: health?.status === 'UP' ? '#ecfdf5' : '#fff7ed', color: health?.status === 'UP' ? '#059669' : '#ea580c', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {health?.status === 'UP' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {health?.status || 'Đang kiểm tra'}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchHealth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Database */}
        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
            <Database size={15} color="#2563eb" /> Cơ sở dữ liệu MySQL
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: health?.database?.status === 'UP' ? '#059669' : '#dc2626' }}>
            {health?.database?.status === 'UP' ? 'Kết nối Tốt' : 'Mất kết nối'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {health?.database?.productName} {health?.database?.productVersion} ({health?.database?.catalog})
          </div>
        </div>

        {/* RAM / JVM Memory */}
        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
            <HardDrive size={15} color="#7c3aed" /> Bộ nhớ JVM / RAM
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            {health?.memory?.usedMb || 0} MB / {health?.memory?.totalMb || 0} MB
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Khả dụng tối đa: {health?.memory?.maxMb || 0} MB
          </div>
        </div>

        {/* CPU & Threads */}
        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
            <Cpu size={15} color="#059669" /> Vi xử lý (CPU Cores)
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            {health?.availableProcessors || 1} Cores
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Thời gian hoạt động (Uptime): {formatUptime(health?.uptimeSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};
