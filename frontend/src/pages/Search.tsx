import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Input, Typography, Space, message, Layout, Select, Spin } from 'antd';
import { SearchOutlined, LogoutOutlined, HeartOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { searchResources, getFavorites, addHistory } from '../api/resources';
import { logout, getStoredUser } from '../api/auth';
import ResourceCard from '../components/ResourceCard';
import FilePreviewModal from '../components/FilePreviewModal';
import type { Resource } from '../types';

const { Text } = Typography;
const { Header, Content } = Layout;

const GRADE_LIST = ['初一', '初二', '初三'];
const SUBJECT_LIST = ['博文', '双语', '托管', '实验P', '实验C'];
const COURSE_TYPES = ['线上', '线下'];
const SEMESTERS = ['暑秋', '寒春'];
const NAV_TABS = ['全部', '课表', '课程大纲', '老师介绍', '政策', '优惠价格'];

const CATEGORY_RULES = [
  { category: '课表', filters: ['grade'] },
  { category: '优惠价格', filters: ['grade'] },
  { category: '老师介绍', filters: ['subject', 'teacher'] },
  { category: '政策', filters: [] },
  { category: '课程大纲', filters: ['grade', 'subject', 'course_type', 'semester'] },
];
const ALL_CATEGORIES = CATEGORY_RULES.map(c => c.category);

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categoryResults, setCategoryResults] = useState<Record<string, Resource[]>>({});
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('全部');

  const [grade, setGrade] = useState<string[]>([]);
  const [subject, setSubject] = useState<string[]>([]);
  const [courseType, setCourseType] = useState<string | undefined>();
  const [semester, setSemester] = useState<string | undefined>();

  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => { if (!getStoredUser()) { navigate('/login'); return; } loadFavorites(); doSearch(); }, []);

  const loadFavorites = async () => {
    try { const favs = await getFavorites(); setFavIds(new Set(favs.map(f => f.id))); } catch { /* */ }
  };

  const doSearch = async () => {
    setLoading(true);
    try {
      const promises = CATEGORY_RULES.map(async ({ category, filters }) => {
        const params: Record<string, string> = { category, size: '100' };
        if (filters.includes('grade') && grade.length) params.grade = grade.join(',');
        if (filters.includes('subject') && subject.length) params.subject = subject.join(',');
        if (filters.includes('course_type') && courseType) params.course_type = courseType;
        if (filters.includes('semester') && semester) params.semester = semester;
        const res = await searchResources(params);
        return { category, items: res.items };
      });
      const results = await Promise.all(promises);
      const newResults: Record<string, Resource[]> = {};
      results.forEach(({ category, items }) => { newResults[category] = items; });
      setCategoryResults(newResults);
    } catch (err: any) { message.error('搜索失败'); }
    finally { setLoading(false); }
  };

  const handlePreview = (resource: Resource) => {
    setPreviewResource(resource); setPreviewVisible(true);
    addHistory(resource.id).catch(() => {});
  };
  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleCategories = activeTab === '全部'
    ? CATEGORY_RULES.map(c => c.category)
    : [activeTab];

  const colorMap: Record<string, string> = {
    '课表': '#3B82F6', '课程大纲': '#8B5CF6', '老师介绍': '#F59E0B', '政策': '#EF4444', '优惠价格': '#10B981',
  };

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1B6E4A', fontStyle: 'italic' }}>谈单助手</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#00A65E' }}>· 新东方</span>
          </div>
          <Space size="small">
            {getStoredUser() && <Text style={{ fontSize: 12, color: '#64748B' }}>{getStoredUser()?.username}</Text>}
            <Button type="text" size="small" icon={<HeartOutlined />} onClick={() => navigate('/favorites')} />
            <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => navigate('/history')} />
            {getStoredUser()?.role === 'admin' && (
              <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => navigate('/admin')} style={{ color: '#00A65E' }} />
            )}
            <Button type="text" size="small" icon={<LogoutOutlined />} onClick={handleLogout} />
          </Space>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px', display: 'flex', overflowX: 'auto' }}>
          {NAV_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '10px 14px', fontSize: 12, fontWeight: 600, border: 'none', background: 'none',
              cursor: 'pointer', color: activeTab === tab ? '#00A65E' : '#64748B',
              borderBottom: activeTab === tab ? '3px solid #00A65E' : '3px solid transparent',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #00A65E 0%, #00994D 50%, #00804A 100%)', color: '#fff', padding: '20px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>高效谈单，精准推荐</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>快速筛选课程物料，一键查阅对比</div>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 16px 50px', display: 'flex', gap: 14 }}>
        {/* Sidebar Filters */}
        <div style={{
          width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
          position: 'sticky', top: 90, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🔍 筛选条件</div>
            <Select mode="multiple" placeholder="年级" style={{ width: '100%', marginBottom: 8 }}
              options={GRADE_LIST.map(g => ({ label: g, value: g }))} value={grade} onChange={setGrade} size="small" />
            <Select mode="multiple" placeholder="科目" style={{ width: '100%', marginBottom: 8 }}
              options={SUBJECT_LIST.map(s => ({ label: s, value: s }))} value={subject} onChange={setSubject} size="small" />
            <Select placeholder="课程类型" allowClear style={{ width: '100%', marginBottom: 8 }}
              options={COURSE_TYPES.map(t => ({ label: t, value: t }))} value={courseType} onChange={setCourseType} size="small" />
            <Select placeholder="学期" allowClear style={{ width: '100%', marginBottom: 10 }}
              options={SEMESTERS.map(s => ({ label: s, value: s }))} value={semester} onChange={setSemester} size="small" />
            <div style={{ display: 'flex', gap: 6 }}>
              <Button type="primary" icon={<SearchOutlined />} onClick={doSearch} loading={loading} block style={{ background: '#00A65E' }}>
                搜索
              </Button>
              <Button onClick={() => { setGrade([]); setSubject([]); setCourseType(undefined); setSemester(undefined); setTimeout(doSearch, 0); }} style={{ color: '#00A65E', borderColor: '#00A65E' }}>
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Spin spinning={loading}>
            {visibleCategories.map(cat => {
              const items = categoryResults[cat];
              if (!items || items.length === 0) return null;
              const dotColor = colorMap[cat] || '#64748B';
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '2px solid #E8F5EE', marginBottom: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{cat}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748B', background: '#E8F5EE', padding: '2px 8px', borderRadius: 10 }}>
                      {items.length}
                    </span>
                  </div>
                  <Row gutter={[8, 8]}>
                    {items.map(r => (
                      <Col xs={12} sm={8} md={6} lg={6} xl={Math.floor(24 / 5)} key={r.id}>
                        <ResourceCard resource={r} isFavorite={favIds.has(r.id)} onFavoriteToggle={loadFavorites} onPreview={handlePreview} />
                      </Col>
                    ))}
                  </Row>
                </div>
              );
            })}
            {!loading && Object.values(categoryResults).every(arr => arr.length === 0) && (
              <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
                <div style={{ fontSize: 40 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>暂无匹配资源</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>请调整筛选条件</div>
              </div>
            )}
          </Spin>
        </div>
      </div>

      <FilePreviewModal resource={previewResource} visible={previewVisible} onClose={() => setPreviewVisible(false)} />
    </div>
  );
};

export default Search;
