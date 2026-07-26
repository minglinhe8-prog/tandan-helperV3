import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, message } from 'antd';
import { StarOutlined, StarFilled, EyeOutlined } from '@ant-design/icons';
import { Resource } from '../types';
import { addFavorite, removeFavorite } from '../api/resources';
import { apiClient } from '../api/client';

interface ResourceCardProps {
  resource: Resource;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onPreview: (resource: Resource) => void;
}

const BADGE_COLORS: Record<string, string> = {
  '.png': '#3B82F6', '.jpg': '#3B82F6', '.jpeg': '#3B82F6', '.gif': '#8B5CF6', '.bmp': '#6366F1',
  '.pdf': '#EF4444',
  '.xlsx': '#10B981', '.xls': '#10B981',
  '.pptx': '#FF6B00', '.ppt': '#FF6B00',
};

const BADGE_CLASS: Record<string, string> = {
  '.png': 'cb-img', '.jpg': 'cb-img', '.jpeg': 'cb-img',
  '.pdf': 'cb-pdf', '.xlsx': 'cb-xls', '.xls': 'cb-xls',
  '.pptx': 'cb-ppt', '.ppt': 'cb-ppt',
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, isFavorite, onFavoriteToggle, onPreview }) => {
  const [imageBlob, setImageBlob] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const isImage = resource.mime_type && ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(resource.mime_type.toLowerCase());

  useEffect(() => {
    if (!isImage || !cardRef.current) return;
    const node = cardRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        apiClient.get(`/resources/${resource.id}/preview`, { responseType: 'blob' })
          .then(res => setImageBlob(URL.createObjectURL(res.data)))
          .catch(() => {});
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [resource.id, isImage]);

  const handleFavorite = async () => {
    try {
      if (isFavorite) { await removeFavorite(resource.id); message.success('已取消收藏'); }
      else { await addFavorite(resource.id); message.success('收藏成功'); }
      onFavoriteToggle();
    } catch { message.error('操作失败'); }
  };

  const ext = resource.mime_type?.toUpperCase() || 'FILE';
  const badgeColor = BADGE_COLORS[resource.mime_type || ''] || '#64748B';

  return (
    <div ref={cardRef} style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      {/* Thumbnail */}
      <div style={{
        height: 105, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }} onClick={() => onPreview(resource)}>
        <span style={{
          position: 'absolute', top: 6, right: 6,
          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          color: '#fff', background: badgeColor, textTransform: 'uppercase',
        }}>
          {resource.mime_type?.replace('.', '') || 'FILE'}
        </span>
        {isImage && imageBlob ? (
          <img src={imageBlob} alt={resource.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 32, opacity: 0.35 }}>📄</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontWeight: 600, fontSize: 11, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 6, color: '#1E293B',
        }}>
          {resource.name}
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 6 }}>
          {resource.category}
          {resource.grade && <span style={{ marginLeft: 6 }}>{resource.grade}</span>}
          {resource.file_size && <span style={{ marginLeft: 6 }}>{resource.file_size.toFixed(0)}KB</span>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
          <Button type="text" size="small" icon={isFavorite ? <StarFilled style={{ color: '#FF6B00' }} /> : <StarOutlined />} onClick={handleFavorite}
            style={{ flex: 1, fontSize: 11, padding: '4px 0' }}>
            {isFavorite ? '已藏' : '收藏'}
          </Button>
          <Button type="primary" size="small" onClick={() => onPreview(resource)}
            style={{ flex: 1, fontSize: 11, fontWeight: 700, background: '#00A65E', padding: '4px 0' }}>
            查看
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
