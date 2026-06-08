import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown, Segmented } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  ShopOutlined,
  TeamOutlined,
  CrownOutlined,
  ProfileOutlined,
  AccountBookOutlined,
  WalletOutlined,
  DollarOutlined,
  AlertOutlined,
  UserSwitchOutlined,
  SolutionOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { clearToken } from './api';
import { useI18n } from './i18n';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);
  const { t, lang, setLang } = useI18n();

  return (
    <ProLayout
      title="茗寳集 分销系统"
      logo={<img src="/img/logo.png" alt="" style={{ height: 28 }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
      layout="mix"
      location={{ pathname }}
      route={{
        path: '/',
        routes: [
          { path: '/dashboard', name: t('m_dashboard'), icon: <DashboardOutlined /> },
          { path: '/products', name: t('m_products'), icon: <ShoppingOutlined /> },
          { path: '/categories', name: t('m_categories'), icon: <AppstoreOutlined /> },
          { path: '/suppliers', name: t('m_suppliers'), icon: <ShopOutlined /> },
          { path: '/distributors', name: t('m_distributors'), icon: <TeamOutlined /> },
          { path: '/opportunities', name: t('m_opportunities'), icon: <SolutionOutlined /> },
          { path: '/levels', name: t('m_levels'), icon: <CrownOutlined /> },
          { path: '/orders', name: t('m_orders'), icon: <ProfileOutlined /> },
          { path: '/payments', name: t('m_payments'), icon: <DollarOutlined /> },
          { path: '/receivables', name: t('m_receivables'), icon: <AlertOutlined /> },
          { path: '/commissions', name: t('m_commissions'), icon: <AccountBookOutlined /> },
          { path: '/withdrawals', name: t('m_withdrawals'), icon: <WalletOutlined /> },
          { path: '/accounts', name: t('m_accounts'), icon: <UserSwitchOutlined /> },
        ],
      }}
      actionsRender={() => [
        <Segmented
          key="lang"
          size="small"
          value={lang}
          onChange={(v) => setLang(v as any)}
          options={[{ label: '中', value: 'zh' }, { label: 'ID', value: 'id' }]}
        />,
      ]}
      menuItemRender={(item, dom) => (
        <div
          onClick={() => {
            setPathname(item.path || '/dashboard');
            navigate(item.path || '/dashboard');
          }}
        >
          {dom}
        </div>
      )}
      avatarProps={{
        title: '管理员',
        size: 'small',
        render: (_, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: t('logout'),
                  onClick: () => {
                    clearToken();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
}
