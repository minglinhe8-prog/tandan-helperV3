import React, { useState, useEffect } from 'react';
import { Modal, Button, Image, Typography, Tag, Spin } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, FilePptOutlined, FileImageOutlined, FileUnknownOutlined } from '@ant-design/icons';
import type { Resource } from '../types';
import { apiClient } from '../api/client';

const { Text } = Typography;

interface Props {
  resource: Resource | null;
  visible: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<Props> = ({ resource, visible, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<{ url: string; name: string } | null>(null);
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
      if (downloadBlob?.url) URL.revokeObjectURL(downloadBlob.url);
      setBlobUrl('');
      setDownloadBlob(null);
      setViewerError(false);
      return;
    }

    const mime = resource.mime_type || '';
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());
    const isPdf = mime === '.pdf';
    const isOffice = ['.xlsx', '.xls', '.pptx', '.ppt'].includes(mime.toLowerCase());

    // Office 文件走 Microsoft Office Online，不需要后端代理
    if (isOffice) {
      setLoading(false);
      setViewerError(false);
      return;
    }

    // 图片和 PDF 走后端代理（blob URL 解决 401 问题）
    setLoading(true);
    apiClient.get(`/resources/${resource.id}/preview`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        if (isPdf || isImage) setBlobUrl(url);
        if (!isPdf && !isImage) setDownloadBlob({ url, name: resource.name });
      })
      .catch(() => setBlobUrl(''))
      .finally(() => setLoading(false));
  }, [resource?.id, visible]);

  if (!resource) return null;

  const mime = resource.mime_type || '';
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(mime.toLowerCase());
  const isPdf = mime === '.pdf';
  const isExcel = mime === '.xlsx' || mime === '.xls';
  const isPpt = mime === '.pptx' || mime === '.ppt';
  const isOffice = isExcel || isPpt;

  // Office 文件用 GitHub Raw URL（公开可访问）
  const officeUrl = isOffice
    ? `https://raw.githubusercontent.com/minglinhe8-prog/tandan-helper/master/${resource.path}`
    : '';
  const viewerUrl = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeUrl)}`
    : '';

  const renderPreview = () => {
    // 图片
    if (isImage) {
      if (loading || !blobUrl) return <Spin />;
      return <Image src={blobUrl} alt={resource.name} style={{ maxWidth: '100%', maxHeight: '60vh' }} />;
    }

    // PDF
    if (isPdf) {
      if (loading || !blobUrl) return <Spin />;
      return (
        <div style={{ width: '100%', height: '75vh' }}>
          <iframe src={blobUrl} title={resource.name} style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      );
    }

    // Office (Excel/PPT) — Microsoft Office Online Viewer
    if (isOffice) {
      if (viewerError) {
        return (
          <div style={{ textAlign: 'center', padding: 60 }}>
            {isExcel ? <FileExcelOutlined style={{ fontSize: 48, color: '#10B981' }} /> : <FilePptOutlined style={{ fontSize: 48, color: '#FF6B00' }} />}
            <p style={{ marginTop: 16, color: '#94A3B8' }}>Office Online 预览加载失败</p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>可能因为文件不在 GitHub 仓库中，或网络问题</p>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button type="primary" onClick={() => window.open(officeUrl, '_blank')}
                style={{ background: '#00A65E' }}>
                在新窗口打开
              </Button>
              {downloadBlob && (
                <a href={downloadBlob.url} download={downloadBlob.name}>
                  <Button style={{ color: '#00A65E', borderColor: '#00A65E' }}>下载文件</Button>
                </a>
              )}
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
            onLoad={() => setLoading(false)}
            onError={() => { setViewerError(true); }}
          />
          {/* 降级提示：30 秒后如果还在加载则显示 */}
        </div>
      );
    }

    // 其他文件
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileUnknownOutlined style={{ fontSize: 48, color: '#64748B' }} />
        <p style={{ marginTop: 20, fontSize: 15, color: '#1E293B' }}>{resource.name}</p>
        <Tag color="blue" style={{ marginTop: 8 }}>{resource.mime_type?.toUpperCase()}</Tag>
        {downloadBlob && <a href={downloadBlob.url} download={downloadBlob.name}>
          <Button type="primary" style={{ marginTop: 20, background: '#00A65E', fontWeight: 700 }}>下载文件</Button>
        </a>}
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
