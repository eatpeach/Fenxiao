import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import { ConfigProvider } from 'antd';
import './index.css';
import Login from './pages/Login';
import Layout from './Layout';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Dashboard from './pages/Dashboard';
import Levels from './pages/Levels';
import Distributors from './pages/Distributors';
import Orders from './pages/Orders';
import Commissions from './pages/Commissions';
import Withdrawals from './pages/Withdrawals';
import { getToken } from './api';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="levels" element={<Levels />} />
            <Route path="distributors" element={<Distributors />} />
            <Route path="orders" element={<Orders />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="withdrawals" element={<Withdrawals />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
