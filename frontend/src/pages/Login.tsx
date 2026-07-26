import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login, getCurrentUser } from '../api/auth';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      await getCurrentUser();
      message.success('登录成功！');
      navigate('/search');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '登录失败');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F5F7FA' }}>
      <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#1B6E4A', fontStyle: 'italic' }}>谈单助手</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#00A65E', marginTop: 2 }}>新东方</div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, letterSpacing: 0.5, marginTop: 4 }}>高效谈单，精准推荐</div>
        </div>
        <Form name="login" initialValues={{ username: 'testuser', password: '123456' }} onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ fontWeight: 700 }}>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
