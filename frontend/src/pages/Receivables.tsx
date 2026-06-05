import { useRef } from 'react';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { api } from '../api';
import { PaymentModal, exportInvoice, dunOrder, money } from '../orderShared';

interface Order {
  id: number;
  order_no: string;
  user_name: string;
  group_no?: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  currency: string;
  age_days: number;
  dunned_at?: string;
  created_at: string;
}

export default function Receivables() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Order>[] = [
    { title: '订单号', dataIndex: 'order_no', width: 180 },
    { title: '客户', dataIndex: 'user_name',
      render: (_, r) => `${r.user_name || '-'}${r.group_no ? `（[斑兔分销 ${r.group_no}]）` : ''}` },
    { title: '应付', dataIndex: 'total_amount', width: 120, render: (_, r) => money(r, r.total_amount) },
    { title: '已收', dataIndex: 'paid_amount', width: 120, render: (_, r) => money(r, r.paid_amount) },
    { title: '尾款', dataIndex: 'outstanding', width: 120,
      render: (_, r) => <b style={{ color: '#cf1322' }}>{money(r, r.outstanding)}</b> },
    { title: '账龄', dataIndex: 'age_days', width: 90,
      render: (_, r) => {
        const d = Number(r.age_days || 0);
        return <Tag color={d > 30 ? 'red' : d > 14 ? 'orange' : 'default'}>{d} 天</Tag>;
      } },
    { title: '最近催收', dataIndex: 'dunned_at', width: 160, render: (_, r) => r.dunned_at || '-' },
    {
      title: '操作', valueType: 'option', width: 200, fixed: 'right',
      render: (_, r) => [
        <a key="dun" onClick={() => dunOrder(r, () => actionRef.current?.reload())}>催收</a>,
        <PaymentModal key="pay" order={r} onDone={() => actionRef.current?.reload()} />,
        <a key="inv" onClick={() => exportInvoice(r.id)}>Invoice</a>,
      ],
    },
  ];

  return (
    <PageContainer title="应收催收">
      <ProTable<Order>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        scroll={{ x: 1100 }}
        request={async (params) => {
          const res = await api.get(`/api/orders?outstanding=1&current=${params.current}&pageSize=${params.pageSize}`);
          return { data: res.data || [], success: res.success, total: res.total };
        }}
      />
    </PageContainer>
  );
}
