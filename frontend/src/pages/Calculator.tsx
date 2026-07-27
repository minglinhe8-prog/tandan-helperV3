import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Select, InputNumber, Button, Tag } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

const { Content } = Layout;
const fmt = (n: number) => n.toFixed(1);
const fmt2 = (n: number) => n.toFixed(2);

interface PriceConfig {
  grade: string; semester: string; type: string;
  isOldStudent: boolean; basePrice: number; hours: number; subjects: string[];
}

function findTier(arr: { maxN: number; [k: string]: any }[], n: number) {
  for (let i = 0; i < arr.length; i++) if (n <= arr[i].maxN) return arr[i];
  return arr[arr.length - 1];
}

function getSections(RULES: any, scene: string, grade: string, id: string): any[] {
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
  return sec.quarters || [];
}

const Calculator: React.FC = () => {
  const [config, setConfig] = useState<{ data: any; rules: any } | null>(null);
  const [scene, setScene] = useState('s1');
  const [grade, setGrade] = useState('初二');
  const [identity, setIdentity] = useState('old');
  const [coupon, setCoupon] = useState(0);
  const [selSubj, setSelSubj] = useState<Record<number, Record<string, Record<string, boolean>>>>({});
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/calculator/data').then(r => r.data),
      apiClient.get('/calculator/rules').then(r => r.data),
    ]).then(([data, rules]) => setConfig({ data, rules }))
      .catch(() => {});
  }, []);

  if (!config) return <div style={{ padding: 80, textAlign: 'center', fontSize: 18, color: '#6b7280' }}>⏳ 正在加载配置...</div>;

  const { data: DATA, rules: RULES } = config;
  const sc = RULES[scene];
  const sections = getSections(RULES, scene, grade, identity);

  const recalc = useCallback(() => {
    if (!DATA || !RULES) return;
    const rules = sc.rules[grade];
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
      const rl = rules[identity];
      const dt = rl.discountType || 'percentage';
      const totalN = rows.reduce((s, r) => s + r.n, 0);
      const tier = findTier(rl.tiers, totalN);
      for (const r of rows) {
        let dp = 0;
        if (r.n > 0) { dp = dt === 'percentage' ? r.unitPrice * (1 - tier.rate) : (tier.amount || 0); }
        const ap = r.n > 0 ? r.unitPrice - dp : 0;
        totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
        rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
      }
    } else {
      if (identity === 'old') {
        const ruleArr = rules[identity];
        for (const r of rows) {
          let dp = 0;
          const matchedRule = ruleArr.find((rr: any) => rr.sectionType === r.sectionType);
          if (matchedRule && r.n > 0) {
            let scopeN = r.n;
            if (matchedRule.scope === 'section') scopeN = rows.filter(rr => rr.sectionType === r.sectionType).reduce((s, rr) => s + rr.n, 0);
            else if (matchedRule.scope === 'crossSection' && matchedRule.crossKeys) { scopeN = 0; for (const rr of rows) { if ((matchedRule.crossKeys as string[]).includes(rr.sectionType + rr.q)) scopeN += rr.n; } }
            const mt = findTier(matchedRule.tiers, scopeN);
            dp = matchedRule.discountType === 'percentage' ? r.unitPrice * (1 - mt.rate) : (mt.amount || 0);
          }
          const ap = r.n > 0 ? r.unitPrice - dp : 0;
          totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours;
          rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap });
        }
      } else {
        const nr = rules[identity];
        if (Array.isArray(nr)) {
          const gRule = nr[0], gdt = gRule.discountType || 'percentage';
          const totalN = rows.reduce((s, r) => s + r.n, 0);
          const tier = findTier(gRule.tiers, totalN);
          for (const r of rows) { let dp = 0; if (r.n > 0 && gdt === 'percentage') dp = r.unitPrice * (1 - tier.rate); const ap = r.n > 0 ? r.unitPrice - dp : 0; totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours; rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap }); }
        } else if (nr.discountType === 'perQuarter') {
          const crossVal: Record<string, number> = {};
          for (const r of rows) { const key = r.sectionType + r.q; crossVal[key] = (crossVal[key] || 0) + r.n; }
          for (const r of rows) { const qRule = nr.quarters[r.q]; let dp = 0; if (qRule && r.n > 0) { if (qRule.discountType === 'fixed') { if (qRule.scope === 'row') dp = findTier(qRule.tiers, r.n).amount; else if (qRule.scope === 'crossSection') { let crossN = 0; if (qRule.crossKeys) for (const k of qRule.crossKeys) crossN += (crossVal[k] || 0); dp = findTier(qRule.tiers, crossN).amount; } } else if (qRule.discountType === 'percentage') dp = r.unitPrice * (1 - findTier(qRule.tiers, r.n).rate); } const ap = r.n > 0 ? r.unitPrice - dp : 0; totalOrig += r.n * r.unitPrice; totalDisc += r.n * dp; totalHrs += r.n * r.hours; rowsOut.push({ label: r.sectionName + ' ' + r.q, n: r.n, subjects: r.subjects, unitPrice: r.unitPrice, discPer: dp, actPrice: ap, rowOrig: r.n * r.unitPrice, rowDisc: r.n * dp, rowFinal: r.n * ap }); }
        }
      }
    }
    setResult({ rowsOut, totalOrig, totalDisc, coupon, finalPrice: Math.max(0, totalOrig - totalDisc - coupon), totalHrs, grade, identity, scene, sc });
  }, [selSubj, grade, identity, coupon, scene, sections, config]);

  useEffect(() => { recalc(); }, [recalc]);

  const handleScene = (s: string) => { setScene(s); setSelSubj({}); setIdentity('old'); setCoupon(0); };
  const handleId = (id: string) => { setIdentity(id); setSelSubj({}); };
  const handleGrade = (g: string) => { setGrade(g); setSelSubj({}); };

  const toggleSubj = (si: number, q: string, sb: string) => {
    setSelSubj(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[si]) next[si] = {};
      if (!next[si][q]) next[si][q] = {};
      if (next[si][q][sb]) delete next[si][q][sb]; else next[si][q][sb] = true;
      return next;
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Content style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px 48px' }}>
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>FY27 暑秋价格计算器</h1>
        </div>
        <div style={{ display: 'flex', marginBottom: 16, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          {['s1','s2'].map(s => (
            <button key={s} onClick={() => handleScene(s)}
              style={{ flex: 1, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600,
                background: scene === s ? '#eff6ff' : '#fff', color: scene === s ? '#2563eb' : '#6b7280',
                border: 'none', borderBottom: scene === s ? '3px solid #2563eb' : '3px solid transparent' }}>
              场景{['一','二'][Number(s==='s2')]}：{RULES[s].title}
            </button>
          ))}
        </div>
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>年级</label>
              <Select value={grade} onChange={handleGrade} style={{ width: '100%' }}>
                <Select.Option value="初一">初一</Select.Option><Select.Option value="初二">初二</Select.Option>
              </Select></div>
            <div><label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>身份类型</label>
              <Select value={identity} onChange={handleId} style={{ width: '100%' }}>
                {Object.entries(sc.identities).map(([k, v]) => <Select.Option key={k} value={k}>{v as string}</Select.Option>)}
              </Select></div>
            <div><label style={{ fontSize: '.8rem', fontWeight: 600, color: '#4b5563' }}>优惠券 (¥)</label>
              <InputNumber min={0} value={coupon || undefined} placeholder="0" onChange={v => setCoupon(v || 0)} style={{ width: '100%' }} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button icon={<ClearOutlined />} onClick={() => { setSelSubj({}); setCoupon(0); }} style={{ width: '100%' }}>重置</Button></div>
          </div>
        </Card>
        <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
          {sections.map((sec: any, si: number) => {
            if (sec.identityFilter && sec.identityFilter !== identity) return null;
            const quarters = getQuarters(sec, identity);
            if (!quarters.length) return null;
            return <div key={si} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#374151', padding: '6px 0', borderBottom: '2px solid #2563eb', marginBottom: 10 }}>{sec.name}</div>
              {quarters.map((q: string) => {
                const gradeData = (DATA.grades[grade] || {})[sec.type] || {};
                const pinfo = sec.prices?.[q] || gradeData[q];
                if (!pinfo) return null;
                const subs: string[] = pinfo.subjects || pinfo.subj || [];
                const up = identity === 'old' ? pinfo.old : pinfo.new;
                const hrs = pinfo.hours || pinfo.hrs || 0;
                return <div key={q} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 72, fontSize: '.82rem', fontWeight: 600, color: '#4b5563', paddingTop: 6 }}>{q}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    {subs.map((sb: string) => {
                      const checked = !!(selSubj[si]?.[q]?.[sb]);
                      return <label key={sb} style={{ position: 'relative', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSubj(si, q, sb)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        <span style={{ display: 'inline-block', padding: '6px 14px', border: '1.5px solid ' + (checked ? '#2563eb' : '#d1d5db'), borderRadius: 18, fontSize: '.84rem', fontWeight: checked ? 600 : 500, color: checked ? '#1d4ed8' : '#4b5563', background: checked ? '#eff6ff' : '#fff', transition: 'all .15s', userSelect: 'none' }}>{sb}</span>
                      </label>;
                    })}
                  </div>
                  <span style={{ fontSize: '.78rem', color: '#9ca3af', minWidth: 100, textAlign: 'right', paddingTop: 6 }}>¥{up} / {hrs}h</span>
                </div>;
              })}
            </div>;
          })}
        </Card>
        {result ? (
          <Card style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 14 }}>
            <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#374151', padding: '6px 0', borderBottom: '2px solid #2563eb', marginBottom: 10 }}>价格明细</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
              {result.rowsOut.map((row: any, i: number) => row.n > 0 && <React.Fragment key={i}>
                <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>{row.label} ({row.n}科)</td><td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 500, color: '#1f2937' }}>{row.subjects.map((s: string) => <Tag key={s} color="blue" style={{ margin: '1px 3px', fontSize: '.78rem' }}>{s}</Tag>)}</td></tr>
                <tr><td style={{ padding: '6px 14px 6px 28px', fontSize: '.78rem', color: '#9ca3af' }}>单价 × 科数</td><td style={{ padding: '6px 14px', fontSize: '.78rem', color: '#9ca3af', textAlign: 'right' }}>¥{fmt(row.unitPrice)} × {row.n} = ¥{fmt(row.rowOrig)}</td></tr>
                {row.discPer > 0 && <tr><td style={{ padding: '6px 14px 6px 28px', fontSize: '.78rem', color: '#059669' }}>单科优惠 × 科数</td><td style={{ padding: '6px 14px', fontSize: '.78rem', color: '#059669', textAlign: 'right' }}>− ¥{fmt(row.discPer)} × {row.n} = − ¥{fmt(row.rowDisc)}</td></tr>}
                <tr><td colSpan={2}><div style={{ borderBottom: '1px solid #f3f4f6', margin: '0 14px' }} /></td></tr>
              </React.Fragment>
              )}
              <tr><td colSpan={2} style={{ height: 1, padding: 0, background: '#f3f4f6' }} /></tr>
              <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>科数合计</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>{result.rowsOut.reduce((s: number, r: any) => s + r.n, 0)} 科</td></tr>
              <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>总原价</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>¥{fmt(result.totalOrig)}</td></tr>
              {result.totalDisc > 0 && <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669' }}>报班优惠合计</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669', textAlign: 'right' }}>− ¥{fmt(result.totalDisc)}</td></tr>}
              {result.coupon > 0 && <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669' }}>可用优惠券</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#059669', textAlign: 'right' }}>− ¥{fmt(result.coupon)}</td></tr>}
              <tr style={{ background: '#fffbfb' }}><td style={{ padding: '12px 14px', fontSize: '1.3rem', fontWeight: 700, color: '#dc2626' }}>优惠后总价</td><td style={{ padding: '12px 14px', fontSize: '1.3rem', fontWeight: 700, color: '#dc2626', textAlign: 'right' }}>¥{fmt(result.finalPrice)}</td></tr>
              {result.totalHrs > 0 && <><tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>总课时</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>{result.totalHrs} 小时</td></tr>
              <tr><td style={{ padding: '9px 14px', fontWeight: 500, color: '#6b7280' }}>课时单价</td><td style={{ padding: '9px 14px', fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>¥{fmt2(result.finalPrice / result.totalHrs)} / 小时</td></tr></>}
            </tbody></table>
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
