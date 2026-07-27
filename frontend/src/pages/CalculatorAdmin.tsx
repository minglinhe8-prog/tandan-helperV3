import React, { useState, useEffect } from 'react';
import { Layout, Card, Input, Button, message, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const { Content } = Layout;

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

  if (!RULES) return <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontFamily: 'sans-serif' }}>加载中...</div>;

  const sc = RULES[scene];
  if (!sc) return <div>场景不存在</div>;
  const idSet = sc.identities || {};
  const rule = (sc.rules?.[grade] || {})[identity];
  const gr = grade, id = identity;

  /* ====== 阶梯表渲染 ====== */
  const renderTierTable = (tiers: any[], discountType: string, prefix: string) => {
    const isPct = discountType === 'percentage';
    return (
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb' }}>#</th>
              <th style={{ padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: '90px' }}>最大科数</th>
              <th style={{ padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: isPct ? '130px' : '120px' }}>
                {isPct ? '折扣率 (0~1)' : '每科立减 ¥'}
              </th>
              <th style={{ padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb' }}>备注</th>
              <th style={{ padding: '7px 8px', background: '#f9fafb', color: '#4b5563', fontWeight: 600, fontSize: '.78rem', borderBottom: '2px solid #e5e7eb', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(tiers || []).map((t: any, i: number) => (
              <tr key={i}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>{i + 1}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" type="number" min={0} value={t.maxN ?? 0}
                    onChange={e => { t.maxN = Number(e.target.value) || 0; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" type="number" step={0.01} min={0}
                    value={isPct ? (t.rate ?? 0) : (t.amount ?? 0)}
                    onChange={e => { const v = Number(e.target.value); if (isPct) t.rate = v; else t.amount = v; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Input size="small" value={t.note || ''} onChange={e => { t.note = e.target.value; forceUpdate(n => n + 1); }} />
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}
                    disabled={!tiers || tiers.length <= 1}
                    onClick={() => { tiers.splice(i, 1); forceUpdate(n => n + 1); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button icon={<PlusOutlined />} size="small" style={{ marginTop: 6 }}
          onClick={() => {
            const newTier: any = { maxN: 999, note: '' };
            if (isPct) newTier.rate = 0; else newTier.amount = 0;
            tiers.push(newTier);
            forceUpdate(n => n + 1);
          }}>
          添加阶梯
        </Button>
      </div>
    );
  };

  /* ====== 路径导航写入 ====== */
  const setByPrefix = (prefix: string, val: any) => {
    const parts = prefix.split('.');
    const field = parts.pop()!;
    const parentPath = parts.join('.');
    const parent = getByPrefix(RULES, parentPath);
    if (parent) {
      parent[field] = val;
      forceUpdate(n => n + 1);
    }
  };

  /* ====== 折扣类型切换（自动迁移 tier 值） ====== */
  const handleTypeChange = (prefix: string, newType: string) => {
    setByPrefix(prefix, newType);
    const tiersPrefix = prefix.replace('.discountType', '.tiers');
    const tiers = getByPrefix(RULES, tiersPrefix);
    if (Array.isArray(tiers)) {
      for (const t of tiers) {
        if (newType === 'percentage') {
          if (t.amount !== undefined && t.rate === undefined) t.rate = t.amount;
          delete t.amount;
        } else {
          if (t.rate !== undefined && t.amount === undefined) t.amount = t.rate;
          delete t.rate;
        }
      }
      forceUpdate(n => n + 1);
    }
  };

  /* ====== 获取 perQuarter 的季度路径 ====== */
  const getQuarterPath = (qq: string, field: string): string => {
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
      setFlash('✅ 已保存到服务器');
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
          <select value={scene} onChange={e => { setScene(e.target.value); setIdentity('old'); }} style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '.86rem', background: '#fff', cursor: 'pointer' }}>
            <option value="s1">场景一：暑秋通用</option>
            <option value="s2">场景二：续班纳新</option>
          </select>
          <select value={grade} onChange={e => setGrade(e.target.value)} style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '.86rem', background: '#fff', cursor: 'pointer' }}>
            <option value="初一">初一</option>
            <option value="初二">初二</option>
          </select>
          <select value={identity} onChange={e => setIdentity(e.target.value)} style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 6, fontSize: '.86rem', background: '#fff', cursor: 'pointer' }}>
            {Object.entries(idSet).map(([k, v]) => <option key={k} value={k}>{String(v)}</option>)}
          </select>
        </Space>

        {/* 场景标题 */}
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 12, padding: '10px 16px', fontWeight: 600, fontSize: '.88rem' }}>
          {sc.title} · {grade} · {sc.identities?.[identity] || ''}
        </div>

        {scene === 's1' ? (
          /* === S1: 百分比全局 === */
          rule && (
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>折扣类型：</span>
                <select value={rule.discountType || 'percentage'} onChange={e => handleTypeChange(`s1.rules.${gr}.${id}.discountType`, e.target.value)}
                  style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 4, fontSize: '.82rem', background: '#fff' }}>
                  <option value="percentage">百分比折扣（按单价×折扣率）</option>
                  <option value="fixed">固定立减（每科减固定金额）</option>
                </select>
                <span style={{ fontWeight: 400, fontSize: '.8rem', color: '#9ca3af', marginLeft: 12 }}>范围：全局总科数</span>
              </div>
              <div style={{ padding: 16 }}>
                {renderTierTable(rule.tiers || [], rule.discountType || 'percentage', `s1.rules.${gr}.${id}.tiers`)}
              </div>
            </div>
          )
        ) : (
          /* === S2: 多 section === */
          (() => {
            const rulesArr = Array.isArray(rule) ? rule : (rule?.quarters ? [rule] : [rule]);
            return (rulesArr || []).map((rl: any, ri: number) => {
              if (!rl) return null;
              if (rl.quarters) {
                return <div key={ri} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', color: '#2563eb' }}>perQuarter 模式</div>
                  <div style={{ padding: 16 }}>
                    {Object.entries(rl.quarters || {}).map(([qq, qr]: any) => {
                      if (!qr) return null;
                      const dt = qr.discountType || 'fixed';
                      const scp = qr.scope || 'row';
                      return <div key={qq} style={{ marginBottom: 14, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '.85rem', color: '#2563eb' }}>{qq}</span>
                          <span style={{ fontSize: '.78rem', color: '#6b7280' }}>折扣类型：</span>
                          <select value={dt} onChange={e => handleTypeChange(getQuarterPath(qq, 'discountType'), e.target.value)}
                            style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 4, fontSize: '.82rem', background: '#fff' }}>
                            <option value="percentage">百分比</option>
                            <option value="fixed">固定立减</option>
                          </select>
                          <span style={{ fontSize: '.78rem', color: '#6b7280' }}>范围：</span>
                          <select value={scp} onChange={e => setByPrefix(getQuarterPath(qq, 'scope'), e.target.value)}
                            style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 4, fontSize: '.82rem', background: '#fff' }}>
                            <option value="row">单行科数</option>
                            <option value="crossSection">跨季度汇总</option>
                          </select>
                          {scp === 'crossSection' && qr.crossKeys && (
                            <span style={{ fontSize: '.78rem', color: '#9ca3af' }}>范围：{qr.crossKeys.join('+')}</span>
                          )}
                        </div>
                        {renderTierTable(qr.tiers || [], dt, getQuarterPath(qq, 'tiers'))}
                      </div>;
                    })}
                  </div>
                </div>;
              } else {
                const dt = rl.discountType || 'fixed';
                const scp = rl.scope || 'section';
                return <div key={ri} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontSize: '.88rem', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#2563eb' }}>{rl.sectionType || '全局'}</span>
                    <select value={dt} onChange={e => handleTypeChange(`s2.rules.${gr}.${id}.${ri}.discountType`, e.target.value)}
                      style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 4, fontSize: '.82rem', background: '#fff' }}>
                      <option value="percentage">百分比折扣</option>
                      <option value="fixed">固定立减</option>
                    </select>
                    <select value={scp} onChange={e => setByPrefix(`s2.rules.${gr}.${id}.${ri}.scope`, e.target.value)}
                      style={{ padding: '5px 8px', border: '1.5px solid #e5e7eb', borderRadius: 4, fontSize: '.82rem', background: '#fff', marginLeft: 6 }}>
                      <option value="section">区内总科数</option>
                      <option value="row">单行科数</option>
                      <option value="crossSection">跨季度汇总</option>
                    </select>
                    {scp === 'crossSection' && rl.crossKeys && (
                      <span style={{ fontSize: '.78rem', color: '#9ca3af' }}>keys: {rl.crossKeys.join('+')}</span>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    {renderTierTable(rl.tiers || [], dt, `s2.rules.${gr}.${id}.${ri}.tiers`)}
                  </div>
                </div>;
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