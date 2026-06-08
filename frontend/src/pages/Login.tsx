import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';

export default function Login() {
  const navigate = useNavigate();

  const handleSubmit = async (values: { username: string; password: string }) => {
    const res = await api.post('/api/login', values);
    if (res.status === 'ok' && res.token) {
      setToken(res.token);
      message.success('登录成功');
      navigate('/dashboard');
    } else {
      message.error(res.errorMessage || '用户名或密码错误');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677ff 0%, #36cfc9 100%)',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '40px 32px',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          width: 380,
        }}
      >
        <LoginForm
          title="茗寳集 分销系统"
          subTitle="烟 · 酒 · 茶 · 茶具 · 特产 分销平台"
          onFinish={handleSubmit}
          submitter={{ searchConfig: { submitText: '登录' } }}
        >
          <ProFormText
            name="username"
            fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
            placeholder="用户名：admin"
            rules={[{ required: true, message: '请输入用户名' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
            placeholder="密码：admin123"
            rules={[{ required: true, message: '请输入密码' }]}
          />
        </LoginForm>
      </div>
    </div>
  );
}
