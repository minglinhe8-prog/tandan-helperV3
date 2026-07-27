import React, { useState, useEffect } from 'react';
import { Layout, Card, Select, Button, Input, message, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const { Content } = Layout;

/* ====== 路径导航工具（复刻桌面版 getTiersByPrefix） ====== */
function getByPrefix(obj: any, prefix: string): any {
  const parts = prefix.split('.');
  let cur = obj;
  for (const p of parts) {
    const key = isNaN(Number(p)) ? p : Number(p);
    if (cur === undefined || cur === null) return null;
    cur = cur[key];
  }
  return cur;
}

function setByPrefix(obj: any, prefix: string, field: string, val: any) {
  const parts = prefix.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    const key = isNaN(Number(parts[i])) ? parts[i] : Number(parts[i]);
    if (i === parts.length - 1) { cur[key] = val; return; }
    cur = cur[key];
    if (!cur) break;
  }
}

/* ====== 组件 ====== */
const CalculatorAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [RULES, setRULES] = useState<any>(null);
  const [scene, setScene] = useState('s1');
  const [grade, setGrade] = useState('初一');
  const [identity, setIdentity] = useState('old');
  const [flash, setFlash] = useState('');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    apiClient.get('/calculator/rules').then(r => r.data).then(setRULES).catch(() => message.error('加载失败'));
  }, []);

  if (!RULES) return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af' }}>加载中...</div>;

  const sc = RULES[scene];
  const rule = sc.rules[grade][identity];
  const gr = grade, id = identity;

  /* ====== 阶梯表渲染 ====== */
  const renderTierTable = (tiers: any[], discountType: string, prefix: string) => {
    const isPct = discountType === 'percentage';
    return (
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb' }}>#</th>
              <th style={{ textAlign: 'left', padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: '90px' }}>最大科数</th>
              <th style={{ textAlign: 'left', padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: isPct ? '130px' : '120px' }}>
                {isPct ? '折扣率 (0~1)' : '每科立减 ¥'}
              </th>
              <th style={{ textAlign: 'left', padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb' }}>备注</th>
              <th style={{ textAlign: 'left', padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t: any, i: number) => (
              <tr key={i}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>{i + 1}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" type="number" min={0} value={t.maxN}
                    onChange={e => { t.maxN = Number(e.target.value) || 0; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" type="number" step={0.01} min={0}
                    value={isPct ? (t.rate || 0) : (t.amount || 0)}
                    onChange={e => { const v = Number(e.target.value); if (isPct) t.rate = v; else t.amount = v; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" value={t.note || ''} onChange={e => { t.note = e.target.value; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}
                    disabled={tiers.length <= 1}
                    onClick={() => { tiers.splice(i, 1); forceUpdate(n => n + 1); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button icon={<PlusOutlined />} size="small" style={{ marginTop: 6 }}
          onClick={() => { tiers.push({ maxN: 999, [isPct ? 'rate' : 'amount']: 0, note: '' }); forceUpdate(n => n + 1); }}>
          添加阶梯
        </Button>
      </div>
    );
  };

  /* ====== 折扣类型切换 ====== */
  const handleTypeChange = (prefix: string, newType: string) => {
    // prefix is full path like 's1.rules.初一.old.discountType' — split to (parent, field)
    const parts = prefix.split('.');
    const field = parts.pop()!;
    const parentPath = parts.join('.');
    setByPrefix(RULES, parentPath, field, newType);
    // 迁移 tier 值
    const tiersPrefix = parentPath + '.tiers';
    const tiers = getByPrefix(RULES, tiersPrefix);
    if (tiers && Array.isArray(tiers)) {
      for (const t of tiers) {
        if (newType === 'percentage') { t.rate = t.amount || 0; delete t.amount; }
        else { t.amount = t.rate || 0; delete t.rate; }
      }
    }
    forceUpdate(n => n + 1);
  };

  const handleScopeChange = (prefix: string, val: string) => {
    const parts = prefix.split('.');
    const field = parts.pop()!;
    const parentPath = parts.join('.');
    setByPrefix(RULES, parentPath, field, val);
    forceUpdate(n => n + 1);
  };

  /* ====== 获取 quarter 路径 ====== */
  const getQuarterPath = (qq: string, field: string) => {
    const rl = RULES.s2.rules[grade][identity];
    for (let i = 0; i < rl.length; i++) {
      if (rl[i].quarters) return `s2.rules.${grade}.${identity}.${i}.quarters.${qq}.${field}`;
    }
    return `s2.rules.${grade}.${identity}.0.quarters.${qq}.${field}`;
  };

  /* ====== 保存 ====== */
  const save = async () => {
    try {
      await apiClient.put('/calculator/rules', RULES);
      setFlash('✅ 已保存到服务器 — 刷新计算器页面即可生效');
      setTimeout(() => setFlash(''), 3000);
    } catch { message.error('保存失败'); }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>返回</Button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>折扣规则管理面板</span>
        </div>
      </div>
      <Content style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <p style={{ fontSize: '.8rem', color: '#6b7280', marginBottom: 12 }}>
          编辑 <code>rules.json</code> — 保存后 <a href="/calculator" target="_blank" rel="noreferrer">刷新计算器</a> 即可生效
        </p>
        {flash && <div style={{ padding: '10px 16px', background: '#d1fae5', color: '#065f46', borderRadius: 6, fontSize: '.84rem', marginBottom: 12 }}>{flash}</div>}

        <Space style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <Select value={scene} onChange={setScene} style={{ width: 200 }}>
            <Select.Option value="s1">场景一：暑秋通用</Select.Option>
            <Select.Option value="s2">场景二：续班纳新</Select.Option>
          </Select>
          <Select value={grade} onChange={setGrade} style={{ width: 90 }}>
            <Select.Option value="初一">初一</Select.Option>
            <Select.Option value="初二">初二</Select.Option>
          </Select>
          <Select value={identity} onChange={setIdentity} style={{ width: 120 }}>
            {Object.entries(sc.identities).map(([k, v]) => <Select.Option key={k} value={k}>{String(v)}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => forceUpdate(n => n + 1)}
            style={{ background: '#2563eb' }} size="small">
            加载规则
          </Button>
        </Space>

        {/* 场景标题 */}
        <Card style={{ borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{sc.title} · {grade} · {sc.identities[identity]}</div>
        </Card>

        {scene === 's1' ? (
          /* === S1: 百分比全局 === */
          <Card style={{ borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>折扣类型：</span>
              <Select
                value={rule.discountType || 'percentage'}
                onChange={(v) => handleTypeChange(`s1.rules.${gr}.${id}.discountType`, v)}
                style={{ width: 220 }} size="small">
                <Select.Option value="percentage">百分比折扣（按单价×折扣率）</Select.Option>
                <Select.Option value="fixed">固定立减（每科减固定金额）</Select.Option>
              </Select>
              <span style={{ fontWeight: 400, fontSize: '.8rem', color: '#9ca3af', marginLeft: 12 }}>范围：全局总科数</span>
            </div>
            <div style={{ padding: 16 }}>
              {renderTierTable(rule.tiers, rule.discountType || 'percentage', `s1.rules.${gr}.${id}.tiers`)}
            </div>
          </Card>
        ) : (
          /* === S2: 多 section === */
          (() => {
            const rulesArr = Array.isArray(rule) ? rule : (rule.quarters ? [rule] : [rule]);
            return rulesArr.map((rl: any, ri: number) => {
              if (rl.quarters) {
                /* perQuarter 模式 */
                return <Card key={ri} style={{ borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', color: '#2563eb' }}>perQuarter 模式</div>
                  <div style={{ padding: 16 }}>
                    {Object.entries(rl.quarters).map(([qq, qr]: any) => {
                      const dt = qr.discountType || 'fixed';
                      const scp = qr.scope || 'row';
                      return <div key={qq} style={{ marginBottom: 14, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '.85rem', color: '#2563eb' }}>{qq}</span>
                          <span style={{ fontSize: '.78rem', color: '#6b7280' }}>折扣类型：</span>
                          <Select value={dt} size="small" style={{ width: 100 }}
                            onChange={(v) => handleTypeChange(getQuarterPath(qq, 'discountType'), v)}>
                            <Select.Option value="percentage">百分比</Select.Option>
                            <Select.Option value="fixed">固定立减</Select.Option>
                          </Select>
                          <span style={{ fontSize: '.78rem', color: '#6b7280' }}>范围：</span>
                          <Select value={scp} size="small" style={{ width: 130 }}
                            onChange={(v) => handleScopeChange(getQuarterPath(qq, 'scope'), v)}>
                            <Select.Option value="row">单行科数</Select.Option>
                            <Select.Option value="crossSection">跨季度汇总</Select.Option>
                          </Select>
                          {scp === 'crossSection' && qr.crossKeys && (
                            <span style={{ fontSize: '.78rem', color: '#9ca3af' }}>范围：{qr.crossKeys.join('+')}</span>
                          )}
                        </div>
                        {renderTierTable(qr.tiers, dt, getQuarterPath(qq, 'tiers'))}
                      </div>;
                    })}
                  </div>
                </Card>;
              } else {
                /* 标准 section */
                const dt = rl.discountType || 'fixed';
                const scp = rl.scope || 'section';
                return <Card key={ri} style={{ borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#2563eb' }}>{rl.sectionType || '全局'}</span>
                    <Select value={dt} size="small" style={{ width: 120 }}
                      onChange={(v) => handleTypeChange(`s2.rules.${gr}.${id}.${ri}.discountType`, v)}>
                      <Select.Option value="percentage">百分比折扣</Select.Option>
                      <Select.Option value="fixed">固定立减</Select.Option>
                    </Select>
                    <Select value={scp} size="small" style={{ width: 130 }}
                      onChange={(v) => handleScopeChange(`s2.rules.${gr}.${id}.${ri}.scope`, v)}>
                      <Select.Option value="section">区内总科数</Select.Option>
                      <Select.Option value="row">单行科数</Select.Option>
                      <Select.Option value="crossSection">跨季度汇总</Select.Option>
                    </Select>
                    {scp === 'crossSection' && rl.crossKeys && (
                      <span style={{ fontSize: '.78rem', color: '#9ca3af' }}>keys: {rl.crossKeys.join('+')}</span>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    {renderTierTable(rl.tiers, dt, `s2.rules.${gr}.${id}.${ri}.tiers`)}
                  </div>
                </Card>;
              }
            });
          })()
        )}

        <Button type="primary" icon={<SaveOutlined />} onClick={save} style={{ background: '#2563eb', fontWeight: 600, padding: '10px 26px', fontSize: '.88rem' }}>
          保存到 rules.json
        </Button>
      </Content>
    </Layout>
  );
};

export default CalculatorAdmin;
