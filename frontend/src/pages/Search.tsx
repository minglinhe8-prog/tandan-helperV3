import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Typography, Space, message, Spin, Drawer } from 'antd';
import { LogoutOutlined, HeartOutlined, HistoryOutlined, SettingOutlined, MenuOutlined, CalculatorOutlined } from '@ant-design/icons';
import { searchResources, getFavorites, addHistory } from '../api/resources';
import { logout, getStoredUser } from '../api/auth';
import ResourceCard from '../components/ResourceCard';
import FilePreviewModal from '../components/FilePreviewModal';
import FilterForm from '../components/FilterForm';
import type { Resource } from '../types';

const { Text } = Typography;
const NAV_TABS = ['全部', '课表', '课程大纲', '老师介绍', '政策', '优惠价格'];

const CATEGORY_RULES = [
  { category: '课表', filters: ['grade'] },
  { category: '优惠价格', filters: ['grade'] },
  { category: '老师介绍', filters: ['subject', 'teacher'] },
  { category: '政策', filters: [] },
  { category: '课程大纲', filters: ['grade', 'subject', 'course_type', 'semester'] },
];

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

  // 响应式
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

  const handleReset = () => {
    setGrade([]); setSubject([]); setCourseType(undefined); setSemester(undefined);
    setTimeout(doSearch, 0);
  };

  const handlePreview = (r: Resource) => { setPreviewResource(r); setPreviewVisible(true); addHistory(r.id).catch(() => {}); };
  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleCategories = activeTab === '全部' ? CATEGORY_RULES.map(c => c.category) : [activeTab];
  const colorMap: Record<string, string> = {
    '课表': '#3B82F6', '课程大纲': '#8B5CF6', '老师介绍': '#F59E0B', '政策': '#EF4444', '优惠价格': '#10B981',
  };

  const filterPanel = (
    <FilterForm
      grade={grade} subject={subject} courseType={courseType} semester={semester}
      onGradeChange={setGrade} onSubjectChange={setSubject}
      onCourseTypeChange={setCourseType} onSemesterChange={setSemester}
      onSearch={doSearch} onReset={handleReset} loading={loading}
      compact={true}
    />
  );

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '6px 12px' : '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 6 }}>
            {isMobile && (
              <Button type="text" icon={<MenuOutlined style={{ fontSize: 18 }} />} onClick={() => setDrawerOpen(true)} />
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1B6E4A', fontStyle: 'italic' }}>谈单助手</span>
            {!isMobile && <span style={{ fontSize: 15, fontWeight: 700, color: '#00A65E' }}>· 新东方</span>}
          </div>
          <Space size="small">
            {!isMobile && getStoredUser() && <Text style={{ fontSize: 12, color: '#64748B' }}>{getStoredUser()?.username}</Text>}
            <Button type="text" size="small" icon={<HeartOutlined />} onClick={() => navigate('/favorites')}>
              {!isMobile && '收藏'}
            </Button>
            <Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => navigate('/history')}>
              {!isMobile && '历史'}
            </Button>
            <Button type="text" size="small" icon={<CalculatorOutlined />} onClick={() => navigate('/calculator')} style={{ color: '#333' }}>
              {!isMobile && '价格计算'}
            </Button>
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
              padding: isMobile ? '8px 10px' : '10px 14px', fontSize: isMobile ? 11 : 12, fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab ? '#00A65E' : '#64748B',
              borderBottom: activeTab === tab ? '3px solid #00A65E' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #00A65E 0%, #00994D 50%, #00804A 100%)', color: '#fff', padding: isMobile ? '14px 12px' : '20px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700 }}>高效谈单，精准推荐</div>
          {!isMobile && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>快速筛选课程物料，一键查阅对比</div>}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '10px 8px 80px' : '14px 16px 50px', display: 'flex', gap: 14 }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 90, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {filterPanel}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Spin spinning={loading}>
            {visibleCategories.map(cat => {
              const items = categoryResults[cat];
              if (!items || items.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '2px solid #E8F5EE', marginBottom: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorMap[cat] || '#64748B', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>{cat}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748B', background: '#E8F5EE', padding: '2px 8px', borderRadius: 10 }}>
                      {items.length}
                    </span>
                  </div>
                  <Row gutter={[isMobile ? 6 : 8, isMobile ? 6 : 8]}>
                    {items.map(r => (
                      <Col xs={24} sm={12} md={8} lg={6} key={r.id}>
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

      {/* Mobile Drawer */}
      <Drawer
        title="筛选条件"
        placement="left"
        width="85%"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: 12 } }}
      >
        <FilterForm
          grade={grade} subject={subject} courseType={courseType} semester={semester}
          onGradeChange={setGrade} onSubjectChange={setSubject}
          onCourseTypeChange={setCourseType} onSemesterChange={setSemester}
          onSearch={() => { doSearch(); setDrawerOpen(false); }}
          onReset={handleReset} loading={loading}
          compact={true}
        />
      </Drawer>

      <FilePreviewModal resource={previewResource} visible={previewVisible} onClose={() => setPreviewVisible(false)} />
    </div>
  );
};

export default Search;
