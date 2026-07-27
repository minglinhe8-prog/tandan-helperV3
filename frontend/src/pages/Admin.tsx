import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Tabs, Table, Button, Card, Statistic, Row, Col, Tag, Select, Space, message, Popconfirm, Switch, Typography } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, FileOutlined, DashboardOutlined, UploadOutlined, InboxOutlined, CalculatorOutlined } from '@ant-design/icons';
import { getStats, getUsers, updateUser, deleteUser } from '../api/admin';
import { getStoredUser } from '../api/auth';
import { apiClient } from '../api/client';
import ResourceTable from './Admin/ResourceTable';
import type { User } from '../types';

const { Text } = Typography;
const { Content } = Layout;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [stats, setStats] = useState<{ total_users: number; total_resources: number; category_stats: Record<string, number> } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Upload state
  const [uploadCategory, setUploadCategory] = useState<string>('课程大纲');
  const [uploadGrade, setUploadGrade] = useState<string>('');
  const [uploadSubject, setUploadSubject] = useState<string>('');
  const [uploadCourseType, setUploadCourseType] = useState<string>('');
  const [uploadSemester, setUploadSemester] = useState<string>('');
  const [uploadFiles, setUploadFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/search'); return; }
    loadStats(); loadUsers();
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const refreshResources = () => { loadStats(); };
  const loadStats = async () => { try { setStats(await getStats()); } catch { /* */ } };
  const loadUsers = async () => { try { setUsers(await getUsers()); } catch { /* */ } };

  const handleToggleActive = async (userId: number, active: boolean) => {
    await updateUser(userId, { is_active: active });
    message.success(active ? '已启用' : '已禁用');
    loadUsers();
  };
  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId); message.success('用户已删除'); loadUsers();
    } catch (e) { message.error('删除失败'); }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) { message.warning('请选择文件'); return; }
    setUploading(true);
    setUploadResults([]);
    const fd = new FormData();
    uploadFiles.forEach(f => fd.append('files', f));
    fd.append('category', uploadCategory);
    if (uploadCourseType) fd.append('course_type', uploadCourseType);
    if (uploadGrade) fd.append('grade', uploadGrade);
    if (uploadSubject) fd.append('subject', uploadSubject);
    if (uploadSemester) fd.append('semester', uploadSemester);
    try {
      const { data } = await apiClient.post('/upload/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResults(data.results);
      const ok = data.results.filter((r: any) => r.status === 'success').length;
      const fail = data.results.length - ok;
      if (fail) message.warning(`成功 ${ok} 个，失败 ${fail} 个`);
      else message.success(`全部 ${ok} 个上传成功`);
      setUploadFiles([]); refreshResources();
    } catch (err: any) { message.error(err.response?.data?.detail || '上传失败'); }
    finally { setUploading(false); }
  };

  const uploadShows = {
    grade: ['课表', '课程大纲', '优惠价格'].includes(uploadCategory),
    subject: ['课程大纲', '老师介绍'].includes(uploadCategory),
    courseType: ['课表', '课程大纲'].includes(uploadCategory),
    semester: ['课表', '课程大纲'].includes(uploadCategory),
  };

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/search')} style={{ fontWeight: 700 }}>返回</Button>
            <span style={{ fontSize: 15, fontWeight: 700 }}>后台管理</span>
          </div>
          <Text style={{ fontSize: 12, color: '#64748B' }}>{user?.username}（管理员）</Text>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px 8px' : '24px 16px' }}>
        <Tabs
          defaultActiveKey="dashboard"
          items={[
            {
              key: 'dashboard', label: <span><DashboardOutlined /> 仪表盘</span>,
              children: (
                <div>
                  {stats && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                      <Col xs={12} sm={6}><Card><Statistic title="用户总数" value={stats.total_users} prefix={<TeamOutlined />} /></Card></Col>
                      <Col xs={12} sm={6}><Card><Statistic title="资源总数" value={stats.total_resources} prefix={<FileOutlined />} /></Card></Col>
                      {Object.entries(stats.category_stats).map(([cat, count]) => (
                        <Col xs={12} sm={6} key={cat}>
                          <Card><Statistic title={cat} value={count} /></Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'users', label: <span><TeamOutlined /> 用户管理</span>,
              children: (
                <Table
                  dataSource={users}
                  rowKey="id"
                  size={isMobile ? 'small' : 'small'}
                  scroll={{ x: 400 }}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '用户名', dataIndex: 'username' },
                    {
                      title: '角色', dataIndex: 'role', render: (r: string) => (
                        <Tag color={r === 'admin' ? 'green' : 'blue'}>{r === 'admin' ? '管理员' : '顾问'}</Tag>
                      ),
                    },
                    {
                      title: '状态', dataIndex: 'is_active', render: (_: boolean, record: User) => (
                        <Switch checked={record.is_active} onChange={(v) => handleToggleActive(record.id, v)} />
                      ),
                    },
                    {
                      title: '操作', render: (_: unknown, record: User) => (
                        <Popconfirm title="确定删除？" onConfirm={() => handleDeleteUser(record.id)}>
                          <Button type="link" danger size="small">删除</Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'resources', label: <span><FileOutlined /> 资源管理</span>,
              children: <ResourceTable />,
            },
            {
              key: 'calc', label: <span><CalculatorOutlined /> 折扣规则</span>,
              children: (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <p style={{ marginBottom: 16, color: '#64748b' }}>编辑价格计算器的折扣规则和价格数据</p>
                  <Button type="primary" icon={<CalculatorOutlined />}
                    onClick={() => navigate('/calculator-admin')}
                    style={{ background: '#2563eb', fontWeight: 700 }}>
                    进入折扣规则管理面板
                  </Button>
                </div>
              ),
            },
            {
              key: 'upload', label: <span><UploadOutlined /> 上传文件</span>,
              children: (
                <div style={{ padding: 16 }}>
                  <Card title="📤 按目录结构上传">
                    <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>分类 *</Text>
                        <Select value={uploadCategory} onChange={(v) => { setUploadCategory(v); setUploadGrade(''); setUploadSubject(''); setUploadCourseType(''); setUploadSemester(''); }} style={{ width: '100%' }}>
                          {['课表', '课程大纲', '老师介绍', '政策', '优惠价格'].map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                        </Select>
                      </Col>

                      {uploadShows.courseType && (
                        <Col xs={12} sm={6}>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>课程类型</Text>
                          <Select allowClear placeholder="不限" value={uploadCourseType || undefined} onChange={(v) => setUploadCourseType(v || '')} style={{ width: '100%' }}>
                            <Select.Option value="线上">线上</Select.Option>
                            <Select.Option value="线下">线下</Select.Option>
                          </Select>
                        </Col>
                      )}

                      {uploadShows.grade && (
                        <Col xs={12} sm={6}>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>年级</Text>
                          <Select allowClear placeholder="不限" value={uploadGrade || undefined} onChange={(v) => setUploadGrade(v || '')} style={{ width: '100%' }}>
                            <Select.Option value="初一">初一</Select.Option>
                            <Select.Option value="初二">初二</Select.Option>
                            <Select.Option value="初三">初三</Select.Option>
                          </Select>
                        </Col>
                      )}

                      {uploadShows.subject && (
                        <Col xs={12} sm={6}>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>科目</Text>
                          <Select allowClear placeholder="不限" value={uploadSubject || undefined} onChange={(v) => setUploadSubject(v || '')} style={{ width: '100%' }}>
                            {['博文', '双语', '托管', '实验P', '实验C'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                          </Select>
                        </Col>
                      )}

                      {uploadShows.semester && (
                        <Col xs={12} sm={6}>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>学期</Text>
                          <Select allowClear placeholder="不限" value={uploadSemester || undefined} onChange={(v) => setUploadSemester(v || '')} style={{ width: '100%' }}>
                            <Select.Option value="暑秋">暑秋</Select.Option>
                            <Select.Option value="寒春">寒春</Select.Option>
                          </Select>
                        </Col>
                      )}
                    </Row>

                    {/* 目标路径预览 */}
                    <div style={{ marginBottom: 16, padding: '8px 12px', background: '#E8F5EE', borderRadius: 8, fontSize: 12, color: '#00A65E' }}>
                      📁 course_data/{uploadCategory}{uploadCourseType ? `/${uploadCourseType}` : ''}{uploadGrade ? `/${uploadGrade}` : ''}{uploadSubject ? `/${uploadSubject}` : ''}{uploadSemester ? `/${uploadSemester}` : ''}/
                    </div>

                    <div style={{
                      border: '2px dashed #d9d9d9', borderRadius: 8, padding: '40px 20px',
                      textAlign: 'center', background: '#FAFAFA', marginBottom: 16, cursor: 'pointer',
                    }}>
                      <input
                        type="file" multiple style={{ display: 'none' }}
                        id="upload-input"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const allowed = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf', 'ppt', 'pptx', 'xlsx', 'xls'];
                          const valid = files.filter(f => allowed.includes(f.name.split('.').pop()?.toLowerCase() || ''));
                          if (valid.length < files.length) message.warning('部分文件类型不支持，已过滤');
                          setUploadFiles(prev => [...prev, ...valid]);
                          (e.target as HTMLInputElement).value = '';
                        }}
                      />
                      <label htmlFor="upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                        <InboxOutlined style={{ fontSize: 36, color: '#00A65E', marginBottom: 8 }} />
                        <div style={{ fontSize: 14, color: '#64748B' }}>点击或拖拽上传文件</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>支持图片、PDF、PPT、Excel，可多选</div>
                      </label>
                    </div>

                    {uploadFiles.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <Text strong>已选 {uploadFiles.length} 个文件：</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                          {uploadFiles.map((f, i) => (
                            <Tag key={i} closable onClose={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}>
                              {f.name} ({Math.round(f.size / 1024)}KB)
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload}
                      loading={uploading} disabled={uploadFiles.length === 0}
                      style={{ background: '#00A65E' }}>
                      上传到服务器
                    </Button>

                    {uploadResults.length > 0 && (
                      <div style={{ marginTop: 20, padding: 16, background: '#F8FAFC', borderRadius: 8 }}>
                        <Text strong>上传结果：</Text>
                        {uploadResults.map((r, i) => (
                          <div key={i} style={{ fontSize: 13, marginTop: 4 }}>
                            {r.filename} —{' '}
                            <Text type={r.status === 'success' ? 'success' : 'danger'}>
                              {r.status === 'success' ? '✅ 成功' : `❌ ${r.message}`}
                            </Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Admin;
