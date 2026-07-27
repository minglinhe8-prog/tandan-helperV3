import React, { useState } from 'react';
import { Layout, Card, Row, Col, Form, Select, Checkbox, InputNumber, Button, Divider, Typography } from 'antd';
import { CalculatorOutlined, ClearOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface PriceConfig {
  grade: '初一' | '初二';
  semester: '暑假' | '秋季' | '暑假CY' | '秋季CY';
  type: '线下' | '线上';
  isOldStudent: boolean;
  basePrice: number;
  hours: number;
  subjects: string[];
}

interface DiscountStep {
  minCount: number;
  maxCount: number;
  discount: number;
}

const PRICE_CONFIGS: PriceConfig[] = [
  { grade: '初一', semester: '秋季', type: '线下', isOldStudent: true, basePrice: 4590, hours: 17, subjects: ['双语', '益智', '实验P', '博文'] },
  { grade: '初一', semester: '秋季CY', type: '线下', isOldStudent: true, basePrice: 5610, hours: 17, subjects: ['双语', '益智', '博文'] },
  { grade: '初一', semester: '秋季', type: '线上', isOldStudent: true, basePrice: 3060, hours: 17, subjects: ['双语', '益智'] },
  { grade: '初一', semester: '暑假', type: '线下', isOldStudent: true, basePrice: 3240, hours: 12, subjects: ['双语', '益智', '实验P', '博文'] },
  { grade: '初一', semester: '暑假CY', type: '线下', isOldStudent: true, basePrice: 3960, hours: 12, subjects: ['双语', '益智', '博文'] },
  { grade: '初一', semester: '暑假', type: '线上', isOldStudent: true, basePrice: 2160, hours: 12, subjects: ['双语', '益智'] },
  { grade: '初一', semester: '暑假', type: '线下', isOldStudent: false, basePrice: 3240, hours: 12, subjects: ['双语', '益智', '实验P', '博文'] },
  { grade: '初一', semester: '秋季', type: '线下', isOldStudent: false, basePrice: 4590, hours: 17, subjects: ['双语', '益智', '实验P', '博文'] },
  { grade: '初一', semester: '暑假CY', type: '线下', isOldStudent: false, basePrice: 3960, hours: 12, subjects: ['双语', '益智', '博文'] },
  { grade: '初一', semester: '秋季CY', type: '线下', isOldStudent: false, basePrice: 5610, hours: 17, subjects: ['双语', '益智', '博文'] },
  { grade: '初一', semester: '暑假', type: '线上', isOldStudent: false, basePrice: 2160, hours: 12, subjects: ['双语', '益智'] },
  { grade: '初一', semester: '秋季', type: '线上', isOldStudent: false, basePrice: 3060, hours: 17, subjects: ['双语', '益智'] },
  { grade: '初二', semester: '暑假', type: '线下', isOldStudent: true, basePrice: 3240, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季', type: '线下', isOldStudent: true, basePrice: 4590, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '暑假CY', type: '线下', isOldStudent: true, basePrice: 3960, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季CY', type: '线下', isOldStudent: true, basePrice: 5610, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '暑假', type: '线上', isOldStudent: true, basePrice: 2160, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季', type: '线上', isOldStudent: true, basePrice: 3060, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '暑假', type: '线下', isOldStudent: false, basePrice: 3240, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季', type: '线下', isOldStudent: false, basePrice: 4590, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '暑假CY', type: '线下', isOldStudent: false, basePrice: 3960, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季CY', type: '线下', isOldStudent: false, basePrice: 5610, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '暑假', type: '线上', isOldStudent: false, basePrice: 2160, hours: 12, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
  { grade: '初二', semester: '秋季', type: '线上', isOldStudent: false, basePrice: 3060, hours: 17, subjects: ['双语', '益智', '博文', '实验P', '实验C'] },
];

const DISCOUNT_STEPS: DiscountStep[] = [
  { minCount: 0, maxCount: 0, discount: 0 },
  { minCount: 1, maxCount: 1, discount: 300 },
  { minCount: 2, maxCount: 2, discount: 466 },
  { minCount: 3, maxCount: 4, discount: 600 },
  { minCount: 5, maxCount: 999, discount: 750 },
];

function getDiscount(count: number, isOldStudent: boolean): number {
  const step = DISCOUNT_STEPS.find(s => count >= s.minCount && count <= s.maxCount);
  if (!step) return 0;
  return isOldStudent ? step.discount : Math.max(step.discount - 100, 0);
}

function calculatePrice(selectedSubjects: string[], config: PriceConfig | null, coupon: number) {
  if (!config || selectedSubjects.length === 0) return null;
  const count = selectedSubjects.length;
  const totalOriginal = config.basePrice * count;
  const perSubjectDiscount = getDiscount(count, config.isOldStudent);
  const subjectDiscount = perSubjectDiscount * count;
  const comboDiscount = config.isOldStudent ? Math.round(totalOriginal * 0.05) : 0;
  const finalPrice = Math.max(totalOriginal - subjectDiscount - comboDiscount - coupon, 0);
  return {
    totalOriginal, subjectDiscount, comboDiscount, coupon, finalPrice,
    perSubjectPrice: config.basePrice - perSubjectDiscount,
    perHourPrice: (config.basePrice - perSubjectDiscount) / config.hours,
    count, subjects: selectedSubjects, config,
  };
}

const Calculator: React.FC = () => {
  const [form] = Form.useForm();
  const [result, setResult] = useState<any>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [currentConfig, setCurrentConfig] = useState<PriceConfig | null>(null);

  const handleValuesChange = (_: any, allValues: any) => {
    const { grade, semester, type, isOldStudent, coupon } = allValues;
    if (!grade || !semester || !type || isOldStudent === undefined) { setResult(null); return; }
    const config = PRICE_CONFIGS.find(
      c => c.grade === grade && c.semester === semester && c.type === type && c.isOldStudent === isOldStudent
    );
    setCurrentConfig(config || null);
    if (!config) { setResult(null); return; }
    const validSubjects = selectedSubjects.filter(s => config.subjects.includes(s));
    setSelectedSubjects(validSubjects);
    form.setFieldsValue({ subjects: validSubjects });
    if (validSubjects.length === 0) { setResult(null); return; }
    setResult(calculatePrice(validSubjects, config, coupon || 0));
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedSubjects([]);
    setResult(null);
    setCurrentConfig(null);
  };

  const handleSubjectChange = (checkedValues: string[]) => {
    setSelectedSubjects(checkedValues);
    handleValuesChange({ subjects: checkedValues }, { ...form.getFieldsValue(), subjects: checkedValues });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Card title={<><CalculatorOutlined /> 价格计算器</>} style={{ borderRadius: 12 }}>
          <Form form={form} layout="vertical" onValuesChange={handleValuesChange} initialValues={{ isOldStudent: true, coupon: 0 }}>
            <Row gutter={24}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="年级" name="grade" rules={[{ required: true }]}>
                  <Select placeholder="选择年级"><Option value="初一">初一</Option><Option value="初二">初二</Option></Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="学期" name="semester" rules={[{ required: true }]}>
                  <Select placeholder="选择学期">
                    <Option value="暑假">暑假</Option><Option value="秋季">秋季</Option>
                    <Option value="暑假CY">暑假CY</Option><Option value="秋季CY">秋季CY</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="课程类型" name="type" rules={[{ required: true }]}>
                  <Select placeholder="选择类型"><Option value="线下">线下</Option><Option value="线上">线上</Option></Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="学员身份" name="isOldStudent" rules={[{ required: true }]}>
                  <Select placeholder="选择身份">
                    <Option value={true}>春季在读老生</Option><Option value={false}>新生</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="报读科目" name="subjects">
              <Checkbox.Group
                options={currentConfig?.subjects?.map(s => ({ label: s, value: s })) || []}
                onChange={handleSubjectChange} value={selectedSubjects}
              />
            </Form.Item>
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item label="可用优惠券（元）" name="coupon">
                  <InputNumber min={0} step={50} style={{ width: '100%' }} placeholder="输入优惠券金额" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <Button icon={<ClearOutlined />} onClick={handleReset}>重置</Button>
              </Col>
            </Row>
          </Form>
        </Card>

        {result && (
          <Card style={{ marginTop: 24, borderRadius: 12, background: '#f0f7ff' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}><StatItem label="报读科目" value={result.subjects.join('、')} /></Col>
              <Col xs={24} sm={8}><StatItem label="科数" value={`${result.count} 科`} /></Col>
              <Col xs={24} sm={8}><StatItem label="单价（元/科）" value={`¥${result.perSubjectPrice.toFixed(0)}`} /></Col>
              <Col xs={24} sm={12}><StatItem label="总原价" value={`¥${result.totalOriginal.toFixed(0)}`} /></Col>
              <Col xs={24} sm={12}><StatItem label="单科优惠（共）" value={`-¥${result.subjectDiscount.toFixed(0)}`} /></Col>
              <Col xs={24} sm={12}><StatItem label="连报优惠" value={`-¥${result.comboDiscount.toFixed(0)}`} /></Col>
              <Col xs={24} sm={12}><StatItem label="可用优惠券" value={`-¥${result.coupon.toFixed(0)}`} /></Col>
              <Col xs={24}>
                <Divider />
                <div style={{ textAlign: 'center' }}>
                  <Title level={2} style={{ color: '#e31c23' }}>优惠后总价：¥{result.finalPrice.toFixed(0)}</Title>
                  <Text type="secondary">课时单价：¥{result.perHourPrice.toFixed(2)}/小时</Text>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {!result && (
          <Card style={{ marginTop: 24, textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">请选择年级、学期、类型和身份，然后勾选科目以计算价格</Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
};

const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div><div style={{ fontSize: 13, color: '#888' }}>{label}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div></div>
);

export default Calculator;
