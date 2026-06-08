import { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Table, Tag, Empty } from 'antd';
import {
  ShoppingOutlined, TeamOutlined, ProfileOutlined,
  DollarOutlined, CheckCircleOutlined, AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const rp = (n: any) => 'Rp' + Number(n || 0).toLocaleString();
const cur = (o: any) => (o?.currency === 'RMB' ? '¥' : 'Rp');

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => { api.get('/api/stats/dashboard').then((r) => setD(r.data || {})); }, []);

  const s = d || {};
  const sales = s.sales || {};
  const todo = s.todo || {};
  const trend: any[] = s.salesTrend || [];
  const maxTrend = Math.max(1, ...trend.map((x) => Number(x.amount || 0)));

  const card = (icon: any, title: string, value: any, suffix?: string, color?: string) => (
    <Card bordered={false} style={{ height: '100%' }}>
      <Statistic title={<span style={{ color: '#8c8c8c' }}>{icon} {title}</span>}
        value={value} suffix={suffix} valueStyle={{ color }} />
    </Card>
  );

  return (
    <PageContainer title="仪表盘">
      {/* 核心指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={4}>{card(<ShoppingOutlined />, '在售商品', s.products?.active ?? '—',
          s.products ? `/${s.products.total}` : '')}</Col>
        <Col xs={12} md={8} lg={4}>{card(<TeamOutlined />, '活跃分销商', s.distributors?.active ?? '—',
          s.distributors ? `/${s.distributors.total}` : '')}</Col>
        <Col xs={12} md={8} lg={4}>{card(<ProfileOutlined />, '本月订单', s.orders?.month ?? '—',
          s.orders ? `/${s.orders.total}` : '')}</Col>
        <Col xs={12} md={8} lg={4}>{card(<DollarOutlined />, '销售额', rp(sales.total))}</Col>
        <Col xs={12} md={8} lg={4}>{card(<CheckCircleOutlined />, '已收款', rp(sales.paid), '', '#52c41a')}</Col>
        <Col xs={12} md={8} lg={4}>{card(<AlertOutlined />, '未收尾款', rp(sales.outstanding), '', '#cf1322')}</Col>
      </Row>

      {/* 待办 + 趋势 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="待办事项" bordered={false} style={{ height: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => navigate('/payments')}>
                  <Statistic title="待确认收款" value={todo.payments ?? 0} suffix="笔"
                    valueStyle={{ color: (todo.payments ? '#fa8c16' : undefined) }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => navigate('/withdrawals')}>
                  <Statistic title="待审核提现" value={todo.withdrawals ?? 0} suffix="笔"
                    valueStyle={{ color: (todo.withdrawals ? '#fa8c16' : undefined) }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => navigate('/receivables')}>
                  <Statistic title="超期未收订单(>30天)" value={todo.overdue ?? 0} suffix="单"
                    valueStyle={{ color: (todo.overdue ? '#cf1322' : undefined) }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" hoverable onClick={() => navigate('/commissions')}>
                  <Statistic title="待结算佣金" value={rp(todo.commissions)} />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="近 14 天销售额 (Rp)" bordered={false} style={{ height: '100%' }}>
            {trend.length ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, paddingTop: 8 }}>
                {trend.map((x) => (
                  <div key={x.d} style={{ flex: 1, textAlign: 'center' }} title={`${x.d}: ${rp(x.amount)}`}>
                    <div style={{
                      height: `${(Number(x.amount) / maxTrend) * 150}px`,
                      background: 'linear-gradient(180deg,#8c2b22,#b14233)', borderRadius: 4, minHeight: 2,
                    }} />
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>{String(x.d).slice(5)}</div>
                  </div>
                ))}
              </div>
            ) : <Empty description="暂无订单" />}
          </Card>
        </Col>
      </Row>

      {/* 排行 + 最近订单 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card title="分销商销售榜 Top 5" bordered={false}>
            <Table rowKey={(_, i) => String(i)} size="small" pagination={false}
              dataSource={s.topDistributors || []}
              columns={[
                { title: '分销商', dataIndex: 'name',
                  render: (_, r: any) => `${r.name || '-'}${r.group_no ? `(${r.group_no})` : ''}` },
                { title: '订单', dataIndex: 'orders', width: 70, align: 'right' },
                { title: '销售额', dataIndex: 'amount', width: 140, align: 'right', render: (v) => rp(v) },
              ]} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="最近订单" bordered={false}>
            <Table rowKey="order_no" size="small" pagination={false}
              dataSource={s.recentOrders || []}
              columns={[
                { title: '订单号', dataIndex: 'order_no', width: 170 },
                { title: '分销商', dataIndex: 'user_name' },
                { title: '应付', dataIndex: 'total_amount', width: 120, align: 'right',
                  render: (_, r: any) => `${cur(r)}${Number(r.total_amount).toLocaleString()}` },
                { title: '收款', width: 90,
                  render: (_, r: any) => {
                    const out = Number(r.total_amount) - Number(r.paid_amount || 0);
                    return out <= 0 ? <Tag color="green">已付清</Tag>
                      : (r.paid_amount > 0 ? <Tag color="orange">部分</Tag> : <Tag color="red">未付</Tag>);
                  } },
              ]} />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
