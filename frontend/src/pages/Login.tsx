import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { message, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { useI18n } from '../i18n';

const ICONS = [
  { e: '🍵', top: '12%', left: '14%', size: 64, delay: '0s' },
  { e: '🍶', top: '24%', left: '70%', size: 80, delay: '1.2s' },
  { e: '🚬', top: '62%', left: '20%', size: 56, delay: '2.1s' },
  { e: '🫖', top: '70%', left: '66%', size: 72, delay: '0.6s' },
  { e: '🎁', top: '44%', left: '44%', size: 60, delay: '1.8s' },
  { e: '🍂', top: '15%', left: '46%', size: 48, delay: '2.6s' },
];

export default function Login() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

  const handleSubmit = async (values: { username: string; password: string }) => {
    const res = await api.post('/api/login', values);
    if (res.status === 'ok' && res.token) {
      setToken(res.token);
      message.success(t('login_ok'));
      navigate('/dashboard');
    } else {
      message.error(res.errorMessage || t('login_fail'));
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-left">
        {ICONS.map((i, k) => (
          <span key={k} className="float-ico"
            style={{ top: i.top, left: i.left, fontSize: i.size, animationDelay: i.delay }}>
            {i.e}
          </span>
        ))}
        <div className="login-brand">
          <img src="/img/logo.png" alt="茗寳集" />
          <div className="login-cn">茗寳集</div>
          <div className="login-en">MING BAO JI</div>
        </div>
        <div className="login-tags">
          <span>{t('slogan1')}</span>
          <span>{t('slogan2')}</span>
          <span>{t('slogan3')}</span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <Segmented
              size="small"
              value={lang}
              onChange={(v) => setLang(v as any)}
              options={[{ label: '中文', value: 'zh' }, { label: 'Bahasa', value: 'id' }]}
            />
          </div>
          <LoginForm
            title={t('login_title')}
            subTitle={t('login_sub')}
            onFinish={handleSubmit}
            submitter={{ searchConfig: { submitText: t('login_btn') } }}
          >
            <ProFormText
              name="username"
              fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
              placeholder={t('username')}
              rules={[{ required: true, message: t('please_username') }]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
              placeholder={t('password')}
              rules={[{ required: true, message: t('please_password') }]}
            />
          </LoginForm>
        </div>
      </div>
    </div>
  );
}
