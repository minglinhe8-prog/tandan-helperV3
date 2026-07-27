import React, { useState, useEffect } from 'react';
import { Modal, Button, Image, Typography, Tag } from 'antd';
import { FileExcelOutlined, FilePptOutlined, FileUnknownOutlined } from '@ant-design/icons';
import type { Resource } from '../types';

const { Text } = Typography;
const GITHUB_RAW = 'https://raw.githubusercontent.com/minglinhe8-prog/tandan-helperV3/main';

interface Props {
  resource: Resource | null;
  visible: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<Props> = ({ resource, visible, onClose }) => {
  const [viewerError, setViewerError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!resource) setViewerError(false);
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

  const renderPreview = () => {
    // 图片
    if (isImage) {
      return <Image src={rawUrl} alt={resource.name} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />;
    }

    // PDF
    if (isPdf) {
      return (
        <div style={{ width: '100%', height: '75vh' }}>
          <iframe src={rawUrl} title={resource.name} style={{ width: '100%', height: '100%', border: 'none' }} />
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
            <p style={{ fontSize: 12, color: '#94A3B8' }}>文件可能尚未同步到 GitHub，请稍后重试</p>
            <div style={{ marginTop: 20 }}>
              <Button type="primary" onClick={() => window.open(rawUrl, '_blank')} style={{ background: '#00A65E' }}>
                在新窗口打开
              </Button>
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

    // 其他文件
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileUnknownOutlined style={{ fontSize: 48, color: '#64748B' }} />
        <p style={{ marginTop: 20, fontSize: 15, color: '#1E293B' }}>{resource.name}</p>
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
