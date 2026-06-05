import { useRef } from 'react';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Image, Popconfirm, Tag, message } from 'antd';
import { api } from '../api';

interface Pay {
  id: number;
  order_no: string;
  user_name: string;
  group_no?: string;
  amount: number;
  total_amount: number;
  paid_amount: number;
  proof_image?: string;
  status: string;
  note?: string;
  created_at: string;
}

const statusTag: Record<string, JSX.Element> = {
  pending: <Tag color="orange">待确认</Tag>,
  confirmed: <Tag color="green">已确认</Tag>,
  rejected: <Tag>已驳回</Tag>,
};

export default function Payments() {
  const actionRef = useRef<ActionType>();

  const act = async (id: number, action: 'confirm' | 'reject') => {
    const res = await api.post(`/api/payments/${id}/${action}`);
    if (res.success) { message.success(action === 'confirm' ? '已确认到账' : '已驳回'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Pay>[] = [
    { title: '订单号', dataIndex: 'order_no', width: 180, search: false },
    { title: '客户', dataIndex: 'user_name', search: false,
      render: (_, r) => `${r.user_name || '-'}${r.group_no ? `（${r.group_no}）` : ''}` },
    { title: '到账金额', dataIndex: 'amount', width: 130, search: false,
      render: (_, r) => Number(r.amount).toLocaleString() },
    { title: '凭证', dataIndex: 'proof_image', width: 70, search: false,
      render: (_, r) => r.proof_image ? <Image src={r.proof_image} width={44} height={44} style={{ objectFit: 'cover' }} /> : '-' },
    { title: '状态', dataIndex: 'status', valueType: 'select', initialValue: 'pending',
      valueEnum: { pending: { text: '待确认' }, confirmed: { text: '已确认' }, rejected: { text: '已驳回' } },
      render: (_, r) => statusTag[r.status] || r.status },
    { title: '备注', dataIndex: 'note', search: false },
    { title: '时间', dataIndex: 'created_at', width: 160, search: false },
    {
      title: '操作', valueType: 'option', width: 130,
      render: (_, r) => r.status === 'pending' ? [
        <Popconfirm key="c" title="确认该笔已到账？" onConfirm={() => act(r.id, 'confirm')}><a>确认到账</a></Popconfirm>,
        <Popconfirm key="r" title="驳回该凭证？" onConfirm={() => act(r.id, 'reject')}>
          <a style={{ color: 'red', marginLeft: 8 }}>驳回</a>
        </Popconfirm>,
      ] : ['-'],
    },
  ];

  return (
    <PageContainer title="收款审核">
      <ProTable<Pay>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const status = params.status || '';
          const res = await api.get(
            `/api/payments?current=${params.current}&pageSize=${params.pageSize}` + (status ? `&status=${status}` : '')
          );
          return { data: res.data || [], success: res.success, total: res.total };
        }}
      />
    </PageContainer>
  );
}
