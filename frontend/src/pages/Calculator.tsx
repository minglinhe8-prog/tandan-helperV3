import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Tabs, Select, InputNumber, Button, Tag } from 'antd';
import { CalculatorOutlined, ClearOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Option } = Select;

/* ====== 原始 data.json 数据 ====== */
const DATA: Record<string, any> = {
  grades: {
    "初一": {
      "线下": {
        "暑假":   { old: 3240, new: 3240, hours: 12, subjects: ["双语","益智","实验P","博文"] },
        "秋季":   { old: 4590, new: 4590, hours: 17, subjects: ["双语","益智","实验P","博文"] },
        "暑假CY": { old: 3960, new: 3960, hours: 12, subjects: ["双语","益智","博文"] },
        "秋季CY": { old: 5610, new: 5610, hours: 17, subjects: ["双语","益智","博文"] }
      },
      "线上": {
        "暑假": { old: 2160, new: 2160, hours: 12, subjects: ["双语","益智"] },
        "秋季": { old: 3060, new: 3060, hours: 17, subjects: ["双语","益智"] }
      }
    },
    "初二": {
      "线下": {
        "暑假":   { old: 3240, new: 3240, hours: 12, subjects: ["双语","益智","博文","实验P","实验C"] },
        "秋季":   { old: 4590, new: 4590, hours: 17, subjects: ["双语","益智","博文","实验P","实验C"] },
        "暑假CY": { old: 3960, new: 3960, hours: 12, subjects: ["双语","益智","博文","实验P","实验C"] },
        "秋季CY": { old: 5610, new: 5610, hours: 17, subjects: ["双语","益智","博文","实验P","实验C"] }
      },
      "线上": {
        "暑假": { old: 2160, new: 2160, hours: 12, subjects: ["双语","益智","博文","实验P","实验C"] },
        "秋季": { old: 3060, new: 3060, hours: 17, subjects: ["双语","益智","博文","实验P","实验C"] }
      }
    }
  }
};

/* ====== 原始 rules.json 规则 ====== */
const RULES: Record<string, any> = {
  s1: {
    identities: { new: "新生", old: "春季在读老生" },
    rules: {
      "初一": {
        new: {
          discountType: "percentage", scope: "global",
          tiers: [
            { maxN: 0, note: "0科", rate: 1 },
            { maxN: 1, note: "1科 → 98折", rate: 0.98 },
            { maxN: 2, note: "2科 → 96折", rate: 0.96 },
            { maxN: 999, note: "3科+ → 94折", rate: 0.94 }
          ]
        },
        old: {
          discountType: "percentage", scope: "global",
          tiers: [
            { maxN: 0, note: "0科", rate: 1 },
            { maxN: 1, note: "1科 → 98折", rate: 0.98 },
            { maxN: 2, note: "2科 → 96折", rate: 0.96 },
            { maxN: 4, note: "4科 → 94折", rate: 0.94 },
            { maxN: 999, note: "6科+ → 94折", rate: 0.94 }
          ]
        }
      },
      "初二": {
        new: {
          discountType: "percentage", scope: "global",
          tiers: [
            { maxN: 0, note: "0科", rate: 1 },
            { maxN: 1, note: "1科 → 98折", rate: 0.98 },
            { maxN: 2, note: "2科 → 96折", rate: 0.96 },
            { maxN: 999, note: "3科+ → 94折", rate: 0.94 }
          ]
        },
        old: {
          discountType: "percentage", scope: "global",
          tiers: [
            { maxN: 0, note: "0科", rate: 1 },
            { maxN: 1, note: "1科 → 98折", rate: 0.98 },
            { maxN: 2, note: "2科 → 96折", rate: 0.96 },
            { maxN: 5, note: "3-5科 → 93折", rate: 0.93 },
            { maxN: 999, note: "6科+ → 92折", rate: 0.92 }
          ]
        }
      }
    },
    sections: [
      { name: "线下课程", quarters: ["暑假","秋季","暑假CY","秋季CY"], type: "线下" },
      { name: "线上课程", quarters: ["暑假","秋季"], type: "线上" }
    ],
    title: "暑秋通用（260701）"
  },
  s2: {
    identities: { new: "不在读/不限对象", old: "暑在读老生续秋/续班" },
    rules: {
      "初一": {
        new: {
          discountType: "perQuarter",
          quarters: {
            "暑假": { discountType: "fixed", scope: "row", tiers: [{ amount: 0, maxN: 0 }, { amount: 100, maxN: 1 }, { amount: 261, maxN: 2 }, { amount: 907, maxN: 3 }, { amount: 948, maxN: 999 }] },
            "暑假CY": { discountType: "percentage", scope: "row", tiers: [{ maxN: 0, rate: 1 }, { maxN: 1, rate: 0.95 }, { maxN: 2, rate: 0.9 }, { maxN: 999, rate: 0.88 }] },
            "秋季": { discountType: "fixed", scope: "crossSection", crossKeys: ["线下秋季","线下秋季CY","线上秋季"], tiers: [{ amount: 0, maxN: 0 }, { amount: 160, maxN: 1 }, { amount: 360, maxN: 2 }, { amount: 600, maxN: 3 }, { amount: 700, maxN: 999 }] },
            "秋季CY": { discountType: "fixed", scope: "crossSection", crossKeys: ["线下秋季","线下秋季CY","线上秋季"], tiers: [{ amount: 0, maxN: 0 }, { amount: 160, maxN: 1 }, { amount: 360, maxN: 2 }, { amount: 600, maxN: 3 }, { amount: 700, maxN: 999 }] }
          }
        },
        old: [
          { discountType: "fixed", scope: "crossSection", sectionType: "线下", crossKeys: ["线下秋季","线下秋季CY","线上秋季"],
            tiers: [{ amount: 0, maxN: 0 }, { amount: 200, maxN: 1 }, { amount: 400, maxN: 2 }, { amount: 700, maxN: 3 }, { amount: 800, maxN: 999 }] },
          { discountType: "fixed", scope: "crossSection", sectionType: "线上", crossKeys: ["线下秋季","线下秋季CY","线上秋季"],
            tiers: [{ amount: 0, maxN: 0 }, { amount: 200, maxN: 1 }, { amount: 400, maxN: 2 }, { amount: 700, maxN: 3 }, { amount: 800, maxN: 999 }] }
        ]
      },
      "初二": {
        new: [
          { discountType: "percentage", scope: "global", sectionType: "*",
            tiers: [{ maxN: 0, rate: 1 }, { maxN: 1, rate: 0.98 }, { maxN: 2, rate: 0.96 }, { maxN: 999, rate: 0.94 }] }
        ],
        old: [
          { discountType: "fixed", scope: "section", sectionType: "线下",
            tiers: [{ amount: 0, maxN: 0 }, { amount: 160, maxN: 1 }, { amount: 280, maxN: 2 }, { amount: 360, maxN: 999 }] },
          { discountType: "fixed", scope: "row", sectionType: "线上",
            tiers: [{ amount: 0, maxN: 0 }, { amount: 120, maxN: 1 }, { amount: 180, maxN: 2 }, { amount: 220, maxN: 999 }] }
        ]
      }
    },
    sections: {
      "初一": {
        new: [
          { name: "线下课程", quarters: ["暑假","秋季","暑假CY","秋季CY"], type: "线下" },
          { name: "线上课程", quarters: ["暑假","秋季"], type: "线上" }
        ],
        old: [
          { name: "线下课程", quarters: ["秋季","秋季CY"], type: "线下" },
          { name: "线上课程", quarters: ["秋季"], type: "线上" }
        ]
      },
      "初二": {
        new: [
          { name: "线下课程", quarters: ["暑假","秋季","暑假CY","秋季CY"], type: "线下" },
          { name: "线上课程", quarters: ["暑假","秋季"], type: "线上" }
        ],
        old: [
          { name: "线下课程", quarters: ["秋季","秋季CY"], type: "线下" },
          { name: "线上课程", quarters: ["秋季"], type: "线上" }
        ]
      }
    },
    title: "续班纳新（260717/260702）"
  }
};

/* ====== 工具函数 ====== */
const fmt = (n: number) => n.toFixed(0);
const fmt2 = (n: number) => n.toFixed(2);

function findTier(arr: { maxN: number; [k: string]: any }[], n: number) {
  for (let i = 0; i < arr.length; i++) if (n <= arr[i].maxN) return arr[i];
  return arr[arr.length - 1];
}

function getSections(scene: string, grade: string, id: string): any[] {
  const sc = RULES[scene];
  const sects = sc.sections;
  if (Array.isArray(sects)) return sects;
  if (typeof sects === 'object') {
    const gs = sects[grade];
    if (!gs) return [];
    return Array.isArray(gs) ? gs : (gs[id] || []);
  }
  return [];
}

function getQuarters(sec: any, id: string): string[] {
  return sec.quarters || sec[id === 'old' ? 'oldQuarters' : 'newQuarters'] || [];
}

/* ====== 组件 ====== */
const Calculator: React.FC = () => {
  const [scene, setScene] = useState<string>('s1');
  const [grade, setGrade] = useState<string>('初二');
  const [identity, setIdentity] = useState<string>('old');
  const [coupon, setCoupon] = useState<number>(0);
  const [selSubj, setSelSubj] = useState<Record<number, Record<string, Record<string, boolean>>>>({});
  const [result, setResult] = useState<any>(null);

  const sc = RULES[scene];
  const sections = getSections(scene, grade, identity);

  // 计算
  const recalc = useCallback(() => {
    if (!DATA || !RULES) return;
    const rules = sc.rules[grade];

    // 收集行
    interface Row { si: number; sectionName: string; sectionType: string; q: string; n: number; subjects: string[]; unitPrice: number; hours: number; }
    const rows: Row[] = [];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      if (sec.identityFilter && sec.identityFilter !== identity) continue;
      const quarters = getQuarters(sec, identity);
      for (const q of quarters) {
        const n = Object.keys(selSubj[si]?.[q] || {}).length;
        const gradeData = (DATA.grades[grade] || {})[sec.type] || {};
        const pinfo = sec.prices?.[q] || gradeData[q];
        if (!pinfo) continue;
        const up = identity === 'old' ? pinfo.old : pinfo.new;
        const hrs = pinfo.hours || pinfo.hrs || 0;
        rows.push({ si, sectionName: sec.name, sectionType: sec.type, q, n, subjects: Object.keys(selSubj[si]?.[q] || {}), unitPrice: up, hours: hrs });
      }
    }

    if (rows.every(r => r.n === 0)) { setResult(null); return; }

    let totalOrig = 0, totalDisc = 0, totalHrs = 0;
    const rowsOut: any[] = [];

    if (scene === 's1') {
      // 场景一：全局规则
      const rl = rules[identity];
      const dt = rl.discountType || 'percentage';
      const totalN = rows.reduce((s, r) => s + r.n, 0);
      const tier = findTier(rl.tiers, totalN);

      for (const r of rows) {
        let dp = 0;
        if (r.n > 0) {
          if (dt === 'percentage') dp = r.unitPrice * (1 - tier.rate);
          else dp = tier.amount || 0;
        }
        const ap = r.n > 0 ? r.unitPrice - dp : 0;
        totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
        rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
      }
    } else {
      // 场景二
      if (identity === 'old') {
        const ruleArr = rules[identity];
        for (const r of rows) {
          let dp = 0;
          const matchedRule = ruleArr.find((rr: any) => rr.sectionType === r.sectionType);
          if (matchedRule && r.n > 0) {
            let scopeN = r.n;
            if (matchedRule.scope === 'section') {
              scopeN = rows.filter(rr => rr.sectionType === r.sectionType).reduce((s, rr) => s + rr.n, 0);
            } else if (matchedRule.scope === 'crossSection' && matchedRule.crossKeys) {
              scopeN = 0;
              for (const rr of rows) {
                const key = rr.sectionType + rr.q;
                if ((matchedRule.crossKeys as string[]).includes(key)) scopeN += rr.n;
              }
            }
            const mt = findTier(matchedRule.tiers, scopeN);
            if (matchedRule.discountType === 'percentage') dp = r.unitPrice * (1 - mt.rate);
            else dp = mt.amount || 0;
          }
          const ap = r.n > 0 ? r.unitPrice - dp : 0;
          totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
          rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
        }
      } else {
        const nr = rules[identity];
        if (Array.isArray(nr)) {
          // 初二新生
          const gRule = nr[0];
          const gdt = gRule.discountType || 'percentage';
          const totalN = rows.reduce((s, r) => s + r.n, 0);
          const tier = findTier(gRule.tiers, totalN);
          for (const r of rows) {
            let dp = 0;
            if (r.n > 0 && gdt === 'percentage') dp = r.unitPrice * (1 - tier.rate);
            const ap = r.n > 0 ? r.unitPrice - dp : 0;
            totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
            rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
          }
        } else if (nr.discountType === 'perQuarter') {
          const crossVal: Record<string, number> = {};
          for (const r of rows) { const key = r.sectionType + r.q; crossVal[key] = (crossVal[key] || 0) + r.n; }
          for (const r of rows) {
            const qRule = nr.quarters[r.q]; let dp = 0;
            if (qRule && r.n > 0) {
              if (qRule.discountType === 'fixed') {
                if (qRule.scope === 'row') dp = findTier(qRule.tiers, r.n).amount;
                else if (qRule.scope === 'crossSection') {
                  let crossN = 0;
                  if (qRule.crossKeys) for (const k of qRule.crossKeys) crossN += (crossVal[k] || 0);
                  dp = findTier(qRule.tiers, crossN).amount;
                }
              } else if (qRule.discountType === 'percentage') {
                dp = r.unitPrice * (1 - findTier(qRule.tiers, r.n).rate);
              }
            }
            const ap = r.n > 0 ? r.unitPrice - dp : 0;
            totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
            rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
          }
        }
      }
    }

    const finalPrice = Math.max(0, totalOrig - totalDisc - coupon);
    setResult({ rowsOut, totalOrig, totalDisc, coupon, finalPrice, totalHrs, grade, identity, scene, sc });
  }, [selSubj, grade, identity, coupon, scene, sections]);

  useEffect(() => { recalc(); }, [recalc]);

  // 切换场景/身份时清空选择
  const handleSceneChange = (s: string) => { setScene(s); setSelSubj({}); setIdentity('old'); setCoupon(0); };
  const handleIdChange = (id: string) => { setIdentity(id); setSelSubj({}); };
  const handleGradeChange = (g: string) => { setGrade(g); setSelSubj({}); };

  const toggleSubj = (si: number, q: string, sb: string) => {
    setSelSubj(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[si]) next[si] = {};
      if (!next[si][q]) next[si][q] = {};
      if (next[si][q][sb]) delete next[si][q][sb];
      else next[si][q][sb] = true;
      return next;
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Content style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px 48px' }}>
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>FY27 暑秋价格计算器</h1>
        </div>

        {/* 场景 TAB */}
        <div style={{ display: 'flex', marginBottom: 16, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          {['s1', 's2'].map(s => (
            <button
              key={s}
              onClick={() => handleSceneChange(s)}
              style={{
                flex: 1, padding: '12px 16px', textAlign: 'center', cursor: 'pointer',
                fontSize: '.9rem', fontWeight: 600, background: scene === s ? '#eff6ff' : '#fff',
                color: scene === s ? '#2563eb' : '#6b7280',
                border: 'none', borderBottom: scene === s ? '3px solid #2563eb' : '3px solid transparent',
                transition: 'all .15s',
              }}
            >
              场景{['一','二'][Number(s==='s2')]}：{RULES[s].title}
            </button>
          ))}
        </div>

        {/* 基本设置 */}
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>年级</label>
              <Select value={grade} onChange={handleGradeChange} style={{ width: '100%' }}>
                <Option value="初一">初一</Option><Option value="初二">初二</Option>
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>身份类型</label>
              <Select value={identity} onChange={handleIdChange} style={{ width: '100%' }}>
                {Object.entries(sc.identities).map(([k, v]) => (
                  <Option key={k} value={k}>{v as string}</Option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>可用优惠券 (¥)</label>
              <InputNumber
                min={0} value={coupon || undefined} placeholder="0"
                onChange={v => setCoupon(v || 0)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button icon={<ClearOutlined />} onClick={() => { setSelSubj({}); setCoupon(0); }}
                style={{ width: '100%' }}>重置</Button>
            </div>
          </div>
        </Card>

        {/* 课程选择 */}
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
          {sections.map((sec, si) => {
            if (sec.identityFilter && sec.identityFilter !== identity) return null;
            const quarters = getQuarters(sec, identity);
            if (!quarters.length) return null;

            return (
              <div key={si} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#374151', padding: '6px 0', borderBottom: '2px solid #2563eb', marginBottom: 10 }}>
                  {sec.name}
                </div>
                {quarters.map((q: string) => {
                  const gradeData = (DATA.grades[grade] || {})[sec.type] || {};
                  const pinfo = sec.prices?.[q] || gradeData[q];
                  if (!pinfo) return null;
                  const subs: string[] = pinfo.subjects || pinfo.subj || [];
                  const up = identity === 'old' ? pinfo.old : pinfo.new;
                  const hrs = pinfo.hours || pinfo.hrs || 0;

                  return (
                    <div key={q} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ minWidth: 72, fontSize: '.82rem', fontWeight: 600, color: '#4b5563', paddingTop: 6, whiteSpace: 'nowrap' }}>{q}</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                        {subs.map((sb: string) => {
                          const checked = !!(selSubj[si]?.[q]?.[sb]);
                          return (
                            <label key={sb} style={{ position: 'relative', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSubj(si, q, sb)}
                                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                              />
                              <span style={{
                                display: 'inline-block', padding: '6px 14px', border: '1.5px solid ' + (checked ? '#2563eb' : '#d1d5db'),
                                borderRadius: 18, fontSize: '.84rem', fontWeight: checked ? 600 : 500,
                                color: checked ? '#1d4ed8' : '#4b5563', background: checked ? '#eff6ff' : '#fff',
                                transition: 'all .15s', userSelect: 'none', whiteSpace: 'nowrap',
                              }}>
                                {sb}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '.78rem', color: '#9ca3af', minWidth: 100, textAlign: 'right', paddingTop: 6, whiteSpace: 'nowrap' }}>
                        ¥{up} / {hrs}h
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>

        {/* 价格明细 */}
        {result ? (
          <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
            <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#374151', padding: '6px 0', borderBottom: '2px solid #2563eb', marginBottom: 10 }}>
              价格明细
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {result.rowsOut.map((row: any, i: number) => (
                  row.n > 0 && <React.Fragment key={i}>
                    <tr>
                      <td style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 500, color: '#6b7280', width: '34%' }}>
                        {row.label} ({row.n}科)
                      </td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 500, color: '#1f2937' }}>
                        {row.subjects.map((s: string) => <Tag key={s} color="blue" style={{ margin: '1px 3px', fontSize: '.78rem', lineHeight: '18px' }}>{s}</Tag>)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 14px 6px 28px', fontSize: '.78rem', color: '#9ca3af', textAlign: 'left' }}>单价 × 科数</td>
                      <td style={{ padding: '6px 14px', fontSize: '.78rem', color: '#9ca3af', textAlign: 'right' }}>¥{fmt(row.unitPrice)} × {row.n} = ¥{fmt(row.rowOrig)}</td>
                    </tr>
                    {row.discPer > 0 && (
                      <tr>
                        <td style={{ padding: '6px 14px 6px 28px', fontSize: '.78rem', color: '#059669', textAlign: 'left' }}>单科优惠 × 科数</td>
                        <td style={{ padding: '6px 14px', fontSize: '.78rem', color: '#059669', textAlign: 'right' }}>− ¥{fmt(row.discPer)} × {row.n} = − ¥{fmt(row.rowDisc)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={2}><div style={{ borderBottom: '1px solid #f3f4f6', margin: '0 14px' }} /></td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr><td colSpan={2} style={{ height: 1, padding: 0, background: '#f3f4f6' }} /></tr>
                <tr>
                  <td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>科数合计</td>
                  <td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>
                    {result.rowsOut.reduce((s: number, r: any) => s + r.n, 0)} 科
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>总原价</td>
                  <td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>¥{fmt(result.totalOrig)}</td>
                </tr>
                {result.totalDisc > 0 && (
                  <tr>
                    <td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669' }}>报班优惠合计</td>
                    <td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669', textAlign: 'right' }}>− ¥{fmt(result.totalDisc)}</td>
                  </tr>
                )}
                {result.coupon > 0 && (
                  <tr>
                    <td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669' }}>可用优惠券</td>
                    <td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669', textAlign: 'right' }}>− ¥{fmt(result.coupon)}</td>
                  </tr>
                )}
                <tr style={{ background: '#fffbfb' }}>
                  <td style={{ padding: '12px 14px', fontSize: '1.3rem', fontWeight: 700, color: '#dc2626' }}>优惠后总价</td>
                  <td style={{ padding: '12px 14px', fontSize: '1.3rem', fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>¥{fmt(result.finalPrice)}</td>
                </tr>
                {result.totalHrs > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>总课时</td>
                      <td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>{result.totalHrs} 小时</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>课时单价</td>
                      <td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>¥{fmt2(result.finalPrice / result.totalHrs)} / 小时</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: '8px 14px', background: '#f9fafb', borderRadius: 8, fontSize: '.8rem', color: '#6b7280' }}>
              年级：<strong>{result.grade}</strong> · 身份：<strong>{sc.identities[result.identity]}</strong>
            </div>
          </Card>
        ) : (
          <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14, textAlign: 'center', padding: '40px 0' }}>
            <span style={{ color: '#9ca3af', fontSize: '.88rem' }}>请勾选科目查看价格明细</span>
          </Card>
        )}
      </Content>
    </Layout>
  );
};

export default Calculator;
