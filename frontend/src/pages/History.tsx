import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Spin, message, Button } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getHistory, addHistory } from '../api/resources';
import { apiClient } from '../api/client';
import ResourceCard from '../components/ResourceCard';
import FilePreviewModal from '../components/FilePreviewModal';
import type { Resource } from '../types';

const History: React.FC = () => {
  const [history, setHistory] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try { const data = await getHistory(); setHistory(data); }
    catch { message.error('加载历史失败'); }
    finally { setLoading(false); }
  };

  const handleClear = async () => {
    try { await apiClient.delete('/history/'); message.success('已清空'); setHistory([]); }
    catch { message.error('清空失败'); }
  };

  const handlePreview = (resource: Resource) => {
    setPreviewResource(resource); setPreviewVisible(true);
    addHistory(resource.id).catch(() => {});
  };

  useEffect(() => { loadHistory(); }, []);

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/search')} style={{ fontWeight: 700 }}>
              返回
            </Button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>🕐 浏览历史</span>
            <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '2px 10px', borderRadius: 10 }}>
              {history.length}
            </span>
          </div>
          <Button icon={<DeleteOutlined />} danger onClick={handleClear} size="small" style={{ fontWeight: 600 }}>
            清空
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <Spin spinning={loading}>
          {history.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#64748B' }}>
              <div style={{ fontSize: 48 }}>🕐</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>暂无浏览记录</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>查看资源后，这里会记录你最近浏览的 20 个文件</div>
            </div>
          ) : (
            <Row gutter={[8, 8]}>
              {history.map(r => (
                <Col xs={12} sm={8} md={6} lg={6} key={r.id}>
                  <ResourceCard resource={r} isFavorite={false} onFavoriteToggle={loadHistory} onPreview={handlePreview} />
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

export default History;
