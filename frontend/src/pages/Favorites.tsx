import React, { useState, useEffect } from 'react';
import { Layout, Typography, Row, Col, Spin, message, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getFavorites, addHistory } from '../api/resources';
import ResourceCard from '../components/ResourceCard';
import FilePreviewModal from '../components/FilePreviewModal';
import type { Resource } from '../types';

const { Title } = Typography;

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const loadFavorites = async () => {
    setLoading(true);
    try { const data = await getFavorites(); setFavorites(data); }
    catch { message.error('加载收藏失败'); }
    finally { setLoading(false); }
  };

  const handlePreview = (resource: Resource) => {
    setPreviewResource(resource); setPreviewVisible(true);
    addHistory(resource.id).catch(() => {});
  };

  useEffect(() => { loadFavorites(); }, []);

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/search')} style={{ fontWeight: 700 }}>
              返回
            </Button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>⭐ 我的收藏</span>
            <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '2px 10px', borderRadius: 10 }}>
              {favorites.length}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <Spin spinning={loading}>
          {favorites.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#64748B' }}>
              <div style={{ fontSize: 48 }}>⭐</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>暂无收藏</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>去搜索页面找到喜欢的资源，点击收藏吧</div>
            </div>
          ) : (
            <Row gutter={[8, 8]}>
              {favorites.map(r => (
                <Col xs={12} sm={8} md={6} lg={6} key={r.id}>
                  <ResourceCard resource={r} isFavorite={true} onFavoriteToggle={loadFavorites} onPreview={handlePreview} />
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </div>

      <FilePreviewModal resource={previewResource} visible={previewVisible} onClose={() => setPreviewVisible(false)} />
    </div>
  );
};

export default Favorites;
