import { useRef } from 'react';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Popconfirm, message, Tag } from 'antd';
import { api } from '../api';

interface Commission {
  id: number;
  order_no: string;
  user_name: string;
  amount: number;
  rate: number;
  level: number;
  status: string;
}

export default function Commissions() {
  const actionRef = useRef<ActionType>();

  const settle = async (id: number) => {
    const res = await api.post(`/api/commissions/${id}/settle`);
    if (res.success) { message.success('已结算并入账'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Commission>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '订单号', dataIndex: 'order_no', width: 180 },
    { title: '受益分销商', dataIndex: 'user_name' },
    { title: '层级', dataIndex: 'level', width: 70, render: (_, r) => `第${r.level}级` },
    { title: '佣金率', dataIndex: 'rate', width: 90, render: (_, r) => `${(r.rate * 100).toFixed(1)}%` },
    { title: '金额', dataIndex: 'amount', render: (_, r) => Number(r.amount).toLocaleString() },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => r.status === 'settled' ? <Tag color="green">已结算</Tag> : <Tag color="orange">待结算</Tag> },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      render: (_, r) =>
        r.status === 'pending'
          ? [
              <Popconfirm key="s" title="确认结算并入账？" onConfirm={() => settle(r.id)}>
                <a>结算</a>
              </Popconfirm>,
            ]
          : ['-'],
    },
  ];

  return (
    <PageContainer title="佣金结算">
      <ProTable<Commission>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async (params) => {
          const res = await api.get(`/api/commissions?current=${params.current}&pageSize=${params.pageSize}`);
          return { data: res.data || [], success: res.success, total: res.total };
        }}
      />
    </PageContainer>
  );
}
