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
  const [imageBlobUrl, setImageBlobUrl] = useState<string>('');
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
      if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
      setImageBlobUrl('');
      setViewerError(false);
      return;
    }
    setViewerError(false);
    const mime = resource.mime_type || '';
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());

    if (isImage) {
      setLoading(true);
      apiClient.get(`/resources/${resource.id}/preview`, { responseType: 'blob' })
        .then(res => setImageBlobUrl(URL.createObjectURL(res.data)))
        .catch(() => setImageBlobUrl(''))
        .finally(() => setLoading(false));
    }
  }, [resource?.id, visible]);

  if (!resource) return null;

  const mime = resource.mime_type || '';
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());
  const isPdf = mime === '.pdf';
  const isExcel = mime === '.xlsx' || mime === '.xls';
  const isPpt = mime === '.pptx' || mime === '.ppt';
  const isOffice = isExcel || isPpt;  // 不包含 PDF

  const rawUrl = `${GITHUB_RAW}/${resource.path}`;
  const viewerUrl = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
    : '';

  const renderPreview = () => {
    // 图片 — blob URL（需要 Auth 头）
    if (isImage) {
      if (loading) return <Spin />;
      if (!imageBlobUrl) return <Text type="secondary">加载失败</Text>;
      return <Image src={imageBlobUrl} alt={resource.name} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />;
    }

    // PDF — <embed> 直接加载 GitHub Raw（不走 Office Online）
    if (isPdf) {
      if (viewerError) {
        return (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <FilePdfOutlined style={{ fontSize: 48, color: '#EF4444' }} />
            <p style={{ marginTop: 20, fontSize: 15 }}>{resource.name}</p>
            <p style={{ color: '#94A3B8' }}>PDF 加载失败</p>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button type="primary" onClick={() => window.open(rawUrl, '_blank')}
                style={{ background: '#EF4444' }}>在新窗口打开</Button>
              <a href={rawUrl} download={resource.name}>
                <Button style={{ color: '#EF4444', borderColor: '#EF4444' }}>下载文件</Button>
              </a>
            </div>
          </div>
        );
      }
      return (
        <div style={{ width: '100%', height: '75vh' }}>
          <embed
            src={rawUrl}
            type="application/pdf"
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setLoading(false)}
            onError={() => setViewerError(true)}
          />
        </div>
      );
    }

    // Office (Excel/PPT) — Office Online Viewer
    if (isOffice) {
      if (viewerError) {
        return (
          <div style={{ textAlign: 'center', padding: 60 }}>
            {isExcel ? <FileExcelOutlined style={{ fontSize: 48, color: '#10B981' }} /> : <FilePptOutlined style={{ fontSize: 48, color: '#FF6B00' }} />}
            <p style={{ marginTop: 16, color: '#94A3B8' }}>Office Online 预览加载失败</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              文件可能大于 50MB 未同步到 GitHub，或文件名含特殊字符
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button type="primary" onClick={() => window.open(rawUrl, '_blank')} style={{ background: '#00A65E' }}>
                GitHub 直链
              </Button>
              <a href={rawUrl} download={resource.name}>
                <Button style={{ color: '#00A65E', borderColor: '#00A65E' }}>下载文件</Button>
              </a>
            </div>
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

    // 其他
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileUnknownOutlined style={{ fontSize: 48, color: '#64748B' }} />
        <p style={{ marginTop: 20, fontSize: 15 }}>{resource.name}</p>
        <Tag color="blue" style={{ marginTop: 8 }}>{mime.toUpperCase()}</Tag>
        <div style={{ marginTop: 20 }}>
          <a href={rawUrl} download={resource.name}>
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
