import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown } from 'antd';
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
  LogoutOutlined,
} from '@ant-design/icons';
import { clearToken } from './api';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);

  return (
    <ProLayout
      title="分销管理系统"
      logo={false}
      layout="mix"
      location={{ pathname }}
      route={{
        path: '/',
        routes: [
          { path: '/dashboard', name: '工作台', icon: <DashboardOutlined /> },
          { path: '/products', name: '商品管理', icon: <ShoppingOutlined /> },
          { path: '/categories', name: '商品分类', icon: <AppstoreOutlined /> },
          { path: '/suppliers', name: '供应商', icon: <ShopOutlined /> },
          { path: '/distributors', name: '分销商', icon: <TeamOutlined /> },
          { path: '/levels', name: '分销等级', icon: <CrownOutlined /> },
          { path: '/orders', name: '订单管理', icon: <ProfileOutlined /> },
          { path: '/payments', name: '收款审核', icon: <DollarOutlined /> },
          { path: '/receivables', name: '应收催收', icon: <AlertOutlined /> },
          { path: '/commissions', name: '佣金结算', icon: <AccountBookOutlined /> },
          { path: '/withdrawals', name: '提现管理', icon: <WalletOutlined /> },
        ],
      }}
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
                  label: '退出登录',
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
