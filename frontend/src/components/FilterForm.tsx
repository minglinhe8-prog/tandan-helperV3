import React from 'react';
import { Button, Select, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const GRADE_LIST = ['初一', '初二', '初三'];
const SUBJECT_LIST = ['博文', '双语', '托管', '实验P', '实验C'];
const COURSE_TYPES = ['线上', '线下'];
const SEMESTERS = ['暑秋', '寒春'];

interface FilterFormProps {
  grade: string[];
  subject: string[];
  courseType: string | undefined;
  semester: string | undefined;
  onGradeChange: (v: string[]) => void;
  onSubjectChange: (v: string[]) => void;
  onCourseTypeChange: (v: string | undefined) => void;
  onSemesterChange: (v: string | undefined) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
  compact?: boolean;
}

const FilterForm: React.FC<FilterFormProps> = ({
  grade, subject, courseType, semester,
  onGradeChange, onSubjectChange, onCourseTypeChange, onSemesterChange,
  onSearch, onReset, loading, compact,
}) => {
  const colStyle = compact
    ? { width: '100%', marginBottom: 10 }
    : { marginRight: 12, marginBottom: 12 };

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
      padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: compact ? 'block' : 'block',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🔍 筛选条件</div>

      <Select
        mode="multiple" placeholder="年级"
        style={{ ...colStyle, width: compact ? '100%' : undefined }}
        options={GRADE_LIST.map(g => ({ label: g, value: g }))}
        value={grade} onChange={onGradeChange}
        size="small"
      />

      <Select
        mode="multiple" placeholder="科目"
        style={{ ...colStyle, width: compact ? '100%' : undefined }}
        options={SUBJECT_LIST.map(s => ({ label: s, value: s }))}
        value={subject} onChange={onSubjectChange}
        size="small"
      />

      <Select
        placeholder="课程类型" allowClear
        style={{ ...colStyle, width: compact ? '100%' : undefined }}
        options={COURSE_TYPES.map(t => ({ label: t, value: t }))}
        value={courseType} onChange={onCourseTypeChange}
        size="small"
      />

      <Select
        placeholder="学期" allowClear
        style={{ ...colStyle, width: compact ? '100%' : undefined }}
        options={SEMESTERS.map(s => ({ label: s, value: s }))}
        value={semester} onChange={onSemesterChange}
        size="small"
      />

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Button type="primary" icon={<SearchOutlined />} onClick={onSearch} loading={loading} block
          style={{ background: '#00A65E' }}>
          搜索
        </Button>
        <Button onClick={onReset} style={{ color: '#00A65E', borderColor: '#00A65E' }}>
          重置
        </Button>
      </div>
    </div>
  );
};

export default FilterForm;
