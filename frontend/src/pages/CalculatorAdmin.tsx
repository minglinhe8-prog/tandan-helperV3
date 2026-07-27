import React, { useState, useEffect } from 'react';
import { Layout, Card, Select, Button, Table, Input, Space, Tag, message, Spin, Tabs } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const { Content } = Layout;

const CalculatorAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scene, setScene] = useState<string>('s1');
  const [grade, setGrade] = useState<string>('初一');
  const [identity, setIdentity] = useState<string>('old');

  useEffect(() => {
    Promise.all([
      apiClient.get('/calculator/rules').then(r => r.data),
      apiClient.get('/calculator/data').then(r => r.data),
    ]).then(([rd, dd]) => { setRules(rd); setData(dd); setLoading(false); })
      .catch(() => { message.error('加载失败'); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" tip="加载折扣规则..." /></div>;
  if (!rules || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>加载失败，请刷新页面</div>;

  // 当前选中的场景/年级/身份
  const sc = rules[scene];
  const idSet = sc.identities;
  const ruleNode = sc.rules?.[grade]?.[identity];

  // 根据不同的规则结构，提取tiers
  const getTiers = (): any[] => {
    if (!ruleNode) return [];
    if (Array.isArray(ruleNode)) return [];
    if (ruleNode.discountType === 'perQuarter') {
      // 只展示一个季度（暑假为例）的 tiers
      const q = Object.keys(ruleNode.quarters || {})[0];
      return ruleNode.quarters?.[q]?.tiers || [];
    }
    return ruleNode.tiers || [];
  };

  const updateTiers = (newTiers: any[]) => {
    setRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      const node = next[scene].rules[grade][identity];
      if (Array.isArray(node)) return prev; // 数组形式不支持单一tier编辑
      if (node.discountType === 'perQuarter') {
        const q = Object.keys(node.quarters || {})[0];
        if (q) node.quarters[q].tiers = newTiers;
      } else {
        node.tiers = newTiers;
      }
      return next;
    });
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await apiClient.put('/calculator/rules', rules);
      message.success('rules 已保存');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const saveData = async () => {
    setSaving(true);
    try {
      await apiClient.put('/calculator/data', data);
      message.success('data 已保存');
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  // 当前规则摘要
  const discountType = Array.isArray(ruleNode) ? 'complex' : ruleNode?.discountType || 'percentage';
  const scope = Array.isArray(ruleNode) ? 'cross-section' : ruleNode?.scope || 'global';

  // prices 编辑（data）
  const editPrice = (grade: string, type: string, q: string, field: 'old' | 'new' | 'hours', val: number) => {
    setData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.grades[grade][type][q]) return prev;
      next.grades[grade][type][q][field] = val;
      return next;
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')} style={{ fontWeight: 700 }}>返回</Button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>折扣规则管理面板</span>
        </div>
      </div>

      <Content style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <Tabs
          items={[
            {
              key: 'rules',
              label: '折扣规则',
              children: (
                <div>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    编辑折扣规则 — 保存后 <Tag color="blue">刷新计算器</Tag> 即可生效
                  </p>
                  <Space style={{ marginBottom: 16 }}>
                    <span>场景：</span>
                    <Select value={scene} onChange={setScene} style={{ width: 130 }}>
                      {Object.entries(rules).map(([k, v]: any) => (
                        <Select.Option key={k} value={k}>{v.title}</Select.Option>
                      ))}
                    </Select>
                    <Select value={grade} onChange={setGrade} style={{ width: 90 }}>
                      <Select.Option value="初一">初一</Select.Option>
                      <Select.Option value="初二">初二</Select.Option>
                    </Select>
                    <Select value={identity} onChange={setIdentity} style={{ width: 130 }}>
                      {Object.entries(idSet).map(([k, v]) => (
                        <Select.Option key={k} value={k}>{v as string}</Select.Option>
                      ))}
                    </Select>
                  </Space>

                  <Card style={{ marginBottom: 14 }}>
                    <div style={{ padding: '8px 16px', background: '#fffbe6', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                      <strong>{sc.title}</strong> · <Tag color="blue">{grade}</Tag> · <Tag color="purple">{idSet[identity]}</Tag>
                    </div>

                    {Array.isArray(ruleNode) ? (
                      <div style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>
                        当前规则为多 section 数组形式，请直接编辑 <code>rules.json</code>
                      </div>
                    ) : (
                      <>
                        <Space style={{ marginBottom: 12 }}>
                          <span>折扣类型：</span>
                          <Select value={discountType} onChange={v => {
                            setRules((prev: any) => {
                              const next = JSON.parse(JSON.stringify(prev));
                              next[scene].rules[grade][identity].discountType = v;
                              return next;
                            });
                          }} style={{ width: 200 }}>
                            <Select.Option value="percentage">百分比折扣（按单价×折扣率）</Select.Option>
                            <Select.Option value="fixed">固定立减（按科数）</Select.Option>
                          </Select>
                          <span style={{ marginLeft: 12, color: '#6b7280' }}>范围：{scope}</span>
                        </Space>

                        <Table
                          dataSource={getTiers().map((t, i) => ({ ...t, _idx: i }))}
                          rowKey="_idx"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: '#', width: 50, render: (_: any, _r: any, idx: number) => idx + 1 },
                            {
                              title: '最大科数', width: 120,
                              render: (_: any, record: any) => (
                                <Input
                                  type="number" size="small" value={record.maxN}
                                  onChange={e => {
                                    const tiers = getTiers();
                                    tiers[record._idx].maxN = Number(e.target.value);
                                    updateTiers(tiers);
                                  }}
                                />
                              )
                            },
                            {
                              title: discountType === 'percentage' ? '折扣率 (0~1)' : '立减金额 (¥)',
                              render: (_: any, record: any) => (
                                <Input
                                  type="number" size="small" step={0.01}
                                  value={discountType === 'percentage' ? record.rate : record.amount}
                                  onChange={e => {
                                    const tiers = getTiers();
                                    const v = Number(e.target.value);
                                    if (discountType === 'percentage') tiers[record._idx].rate = v;
                                    else tiers[record._idx].amount = v;
                                    updateTiers(tiers);
                                  }}
                                />
                              )
                            },
                            {
                              title: '备注', render: (_: any, record: any) => (
                                <Input size="small" value={record.note || ''} placeholder="例如 2科 → 96折"
                                  onChange={e => {
                                    const tiers = getTiers();
                                    tiers[record._idx].note = e.target.value;
                                    updateTiers(tiers);
                                  }}
                                />
                              )
                            },
                            {
                              title: '', width: 50, render: (_: any, record: any) => (
                                <Button type="text" danger icon={<DeleteOutlined />} size="small"
                                  onClick={() => {
                                    const tiers = getTiers();
                                    tiers.splice(record._idx, 1);
                                    updateTiers(tiers);
                                  }}
                                />
                              )
                            }
                          ]}
                        />
                        <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => {
                          const last = getTiers()[getTiers().length - 1];
                          const newTier = discountType === 'percentage'
                            ? { maxN: (last?.maxN || 0) + 1, note: '新阶梯', rate: 1 }
                            : { maxN: (last?.maxN || 0) + 1, note: '新阶梯', amount: 0 };
                          updateTiers([...getTiers(), newTier]);
                        }}>添加阶梯</Button>
                      </>
                    )}
                  </Card>

                  <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveRules}
                    style={{ background: '#2563eb' }}>
                    保存到 rules.json
                  </Button>
                </div>
              )
            },
            {
              key: 'prices',
              label: '价格数据',
              children: (
                <div>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    编辑每个年级 / 课程类型 / 学期 的价格、课时、科目列表
                  </p>
                  <Table
                    dataSource={Object.entries(data.grades).flatMap(([g, types]: any) =>
                      Object.entries(types).flatMap(([t, qs]: any) =>
                        Object.entries(qs).map(([q, info]: any) => ({
                          key: `${g}-${t}-${q}`,
                          grade: g, type: t, quarter: q, info,
                        }))
                      )
                    )}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                    columns={[
                      { title: '年级', dataIndex: 'grade', width: 80 },
                      { title: '类型', dataIndex: 'type', width: 80 },
                      { title: '学期', dataIndex: 'quarter', width: 90 },
                      {
                        title: '老生价', width: 110,
                        render: (_: any, r: any) => (
                          <Input type="number" size="small" value={r.info.old}
                            onChange={e => editPrice(r.grade, r.type, r.quarter, 'old', Number(e.target.value))}
                          />
                        )
                      },
                      {
                        title: '新生价', width: 110,
                        render: (_: any, r: any) => (
                          <Input type="number" size="small" value={r.info.new}
                            onChange={e => editPrice(r.grade, r.type, r.quarter, 'new', Number(e.target.value))}
                          />
                        )
                      },
                      {
                        title: '课时', width: 80,
                        render: (_: any, r: any) => (
                          <Input type="number" size="small" value={r.info.hours}
                            onChange={e => editPrice(r.grade, r.type, r.quarter, 'hours', Number(e.target.value))}
                          />
                        )
                      },
                      {
                        title: '科目', render: (_: any, r: any) => (
                          <span style={{ fontSize: 12 }}>{(r.info.subjects || []).join('、')}</span>
                        )
                      }
                    ]}
                  />
                  <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveData}
                    style={{ marginTop: 16, background: '#2563eb' }}>
                    保存到 data.json
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Content>
    </Layout>
  );
};

export default CalculatorAdmin;