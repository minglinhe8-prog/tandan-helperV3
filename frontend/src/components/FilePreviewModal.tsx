import React, { useState, useEffect } from 'react';
import { Modal, Button, Image, Typography, Tag, Spin } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, FilePptOutlined, FileUnknownOutlined } from '@ant-design/icons';
import type { Resource } from '../types';
import { apiClient } from '../api/client';

const { Text } = Typography;
const GITHUB_RAW = 'https://raw.githubusercontent.com/minglinhe8-prog/tandan-helperV3/main';

interface Props {
  resource: Resource | null;
  visible: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<Props> = ({ resource, visible, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!resource || !visible) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl('');
      setViewerError(false);
      return;
    }
    setViewerError(false);
    const mime = resource.mime_type || '';
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());
    const isPdf = mime === '.pdf';

    if (isImage || isPdf) {
      setLoading(true);
      apiClient.get(`/resources/${resource.id}/preview`, { responseType: 'blob' })
        .then(res => {
          // PDF 也用 blob URL（解决 auth header 跨 iframe 失效）
          setBlobUrl(URL.createObjectURL(res.data));
        })
        .catch(err => {
          console.warn('preview fetch failed', err);
          // 兜底：渲染 GitHub Raw
          setBlobUrl('');
        })
        .finally(() => setLoading(false));
    }
  }, [resource?.id, visible]);

  if (!resource) return null;

  const mime = resource.mime_type || '';
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());
  const isPdf = mime === '.pdf';
  const isExcel = mime === '.xlsx' || mime === '.xls';
  const isPpt = mime === '.pptx' || mime === '.ppt';
  const isOffice = isExcel || isPpt;

  const rawUrl = `${GITHUB_RAW}/${resource.path}`;
  const viewerUrl = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
    : '';
  // 也支持后端代理：预览端点自动判断本地文件或 GitHub redirect
  const proxyUrl = `/api/resources/${resource.id}/preview`;

  const renderPreview = () => {
    // 图片
    if (isImage) {
      if (loading) return <Spin />;
      return <Image src={blobUrl} alt={resource.name} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />;
    }

    // PDF — 新窗口打开（Chrome 内置 PDF 阅读器，比 iframe 稳定）
    if (isPdf) {
      if (loading) return <Spin />;
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <FilePdfOutlined style={{ fontSize: 48, color: '#EF4444' }} />
          <p style={{ marginTop: 20, fontSize: 15, color: '#1E293B' }}>{resource.name}</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{resource.file_size?.toFixed(1)} KB</p>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button type="primary" onClick={() => {
              if (blobUrl) window.open(blobUrl, '_blank');
              else window.open(rawUrl, '_blank');
            }} style={{ background: '#EF4444' }}>
              在新窗口打开
            </Button>
            <a href={blobUrl || rawUrl} download={resource.name}>
              <Button style={{ color: '#EF4444', borderColor: '#EF4444' }}>下载文件</Button>
            </a>
          </div>
        </div>
      );
    }

    // Office (Excel/PPT) — Office Online Viewer + GitHub Raw
    if (isOffice) {
      if (viewerError) {
        return (
          <div style={{ textAlign: 'center', padding: 60 }}>
            {isExcel ? <FileExcelOutlined style={{ fontSize: 48, color: '#10B981' }} /> : <FilePptOutlined style={{ fontSize: 48, color: '#FF6B00' }} />}
            <p style={{ marginTop: 16, color: '#94A3B8' }}>Office Online 预览加载失败</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              文件可能因为太大（&gt;50MB）未同步到 GitHub，或文件名含特殊字符
            </p>
            <Button type="primary" onClick={() => window.open(rawUrl, '_blank')} style={{ background: '#00A65E', marginRight: 8 }}>
              GitHub 直链
            </Button>
            <a href={proxyUrl} download={resource.name}>
              <Button style={{ color: '#00A65E', borderColor: '#00A65E' }}>下载到本地</Button>
            </a>
          </div>
        );
      }
      return (
        <div style={{ width: '100%', height: '75vh', position: 'relative' }}>
          <iframe
            src={viewerUrl}
            title={resource.name}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
            onError={() => setViewerError(true)}
          />
        </div>
      );
    }

    // 其他文件
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileUnknownOutlined style={{ fontSize: 48, color: '#64748B' }} />
        <p style={{ marginTop: 20, fontSize: 15, color: '#1E293B' }}>{resource.name}</p>
        <Tag color="blue" style={{ marginTop: 8 }}>{mime.toUpperCase()}</Tag>
        <div style={{ marginTop: 20 }}>
          <a href={proxyUrl} download={resource.name}>
            <Button type="primary" style={{ background: '#00A65E', fontWeight: 700 }}>下载文件</Button>
          </a>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '98%' : '95%'}
      centered={false}
      style={{ top: 0, maxWidth: 1600, width: '95%' }}
      styles={{
        body: { height: isMobile ? '85vh' : 'calc(100vh - 130px)', padding: isMobile ? 12 : 8 },
        content: { height: '100vh' }
      }}
      title={
        <div style={{ fontSize: 14 }}>
          <Text strong>{resource.name}</Text>
          {resource.category && <Tag style={{ marginLeft: 8 }}>{resource.category}</Tag>}
          {resource.grade && <Tag color="blue">{resource.grade}</Tag>}
          {resource.subject && <Tag color="purple">{resource.subject}</Tag>}
        </div>
      }
    >
      {renderPreview()}
    </Modal>
  );
};

export default FilePreviewModal;
