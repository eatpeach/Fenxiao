import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormSelect,
  ProFormDigit,
  ProFormText,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

interface Withdrawal {
  id: number;
  user_name: string;
  user_balance: number;
  amount: number;
  status: string;
  remark: string;
  created_at: string;
}

const statusTag: Record<string, JSX.Element> = {
  pending: <Tag color="orange">待审核</Tag>,
  paid: <Tag color="green">已打款</Tag>,
  rejected: <Tag color="red">已拒绝</Tag>,
};

const distributorOptions = async () => {
  const res = await api.get('/api/distributors?pageSize=100');
  return (res.data || []).map((d: any) => ({
    label: `${d.name}(${d.username}) 余额${Number(d.balance || 0).toLocaleString()}`,
    value: d.id,
  }));
};

export default function Withdrawals() {
  const actionRef = useRef<ActionType>();

  const review = async (id: number, action: 'approve' | 'reject') => {
    const res = await api.post(`/api/withdrawals/${id}/review`, { action });
    if (res.success) { message.success('已处理'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Withdrawal>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '分销商', dataIndex: 'user_name' },
    { title: '当前余额', dataIndex: 'user_balance', render: (_, r) => Number(r.user_balance || 0).toLocaleString() },
    { title: '提现金额', dataIndex: 'amount', render: (_, r) => Number(r.amount).toLocaleString() },
    { title: '状态', dataIndex: 'status', render: (_, r) => statusTag[r.status] || r.status },
    { title: '备注', dataIndex: 'remark' },
    { title: '时间', dataIndex: 'created_at', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      render: (_, r) =>
        r.status === 'pending'
          ? [
              <Popconfirm key="a" title="通过并扣减余额？" onConfirm={() => review(r.id, 'approve')}>
                <a>通过</a>
              </Popconfirm>,
              <Popconfirm key="r" title="确认拒绝？" onConfirm={() => review(r.id, 'reject')}>
                <a style={{ color: 'red' }}>拒绝</a>
              </Popconfirm>,
            ]
          : ['-'],
    },
  ];

  return (
    <PageContainer title="提现管理">
      <ProTable<Withdrawal>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async (params) => {
          const res = await api.get(`/api/withdrawals?current=${params.current}&pageSize=${params.pageSize}`);
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        toolBarRender={() => [
          <ModalForm
            key="create"
            title="发起提现"
            trigger={<Button type="primary" icon={<PlusOutlined />}>发起提现</Button>}
            width={420}
            onFinish={async (v) => {
              const res = await api.post('/api/withdrawals', v);
              if (res.success) { message.success('已提交'); actionRef.current?.reload(); return true; }
              message.error(res.errorMessage || '失败');
              return false;
            }}
          >
            <ProFormSelect name="user_id" label="分销商" request={distributorOptions} showSearch rules={[{ required: true }]} />
            <ProFormDigit name="amount" label="提现金额" min={1} rules={[{ required: true }]} />
            <ProFormText name="remark" label="备注" />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
}
