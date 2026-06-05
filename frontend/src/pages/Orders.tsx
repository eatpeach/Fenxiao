import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormList,
  ProFormDigit,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';
import { PaymentModal, PayStatusTag, exportInvoice, dunOrder, money } from '../orderShared';

interface Order {
  id: number;
  order_no: string;
  user_name: string;
  group_no?: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  currency: string;
  status: string;
  item_count: number;
  created_at: string;
}

const statusColor: Record<string, string> = {
  pending: 'orange', paid: 'blue', shipped: 'cyan', done: 'green', cancelled: 'default',
};

const distributorOptions = async () => {
  const res = await api.get('/api/distributors?pageSize=100');
  return (res.data || []).map((d: any) => ({ label: `${d.name}(${d.username})`, value: d.id }));
};
const productOptions = async () => {
  const res = await api.get('/api/products?pageSize=100');
  return (res.data || []).map((p: any) => ({ label: `${p.name} ${p.spec || ''}`, value: p.id }));
};

export default function Orders() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Order>[] = [
    { title: '订单号', dataIndex: 'order_no', width: 180 },
    { title: '分销商', dataIndex: 'user_name' },
    { title: '商品数', dataIndex: 'item_count', width: 80 },
    { title: '应付', dataIndex: 'total_amount', width: 120, render: (_, r) => money(r, r.total_amount) },
    { title: '已收', dataIndex: 'paid_amount', width: 120, render: (_, r) => money(r, r.paid_amount) },
    { title: '尾款', dataIndex: 'outstanding', width: 120,
      render: (_, r) => money(r, r.outstanding ?? r.total_amount - (r.paid_amount || 0)) },
    { title: '收款', dataIndex: 'pay', width: 90, render: (_, r) => <PayStatusTag order={r} /> },
    { title: '状态', dataIndex: 'status', width: 90, render: (_, r) => <Tag color={statusColor[r.status]}>{r.status}</Tag> },
    { title: '时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', valueType: 'option', width: 190, fixed: 'right',
      render: (_, r) => {
        const out = Number(r.outstanding ?? r.total_amount - (r.paid_amount || 0));
        return [
          <PaymentModal key="pay" order={r} onDone={() => actionRef.current?.reload()} />,
          <a key="inv" onClick={() => exportInvoice(r.id)}>Invoice</a>,
          out > 0 ? <a key="dun" onClick={() => dunOrder(r, () => actionRef.current?.reload())}>催收</a> : null,
        ];
      },
    },
  ];

  return (
    <PageContainer title="订单管理">
      <ProTable<Order>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        scroll={{ x: 1300 }}
        request={async (params) => {
          const res = await api.get(`/api/orders?current=${params.current}&pageSize=${params.pageSize}`);
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        toolBarRender={() => [
          <CreateOrder key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function CreateOrder({ onDone }: { onDone: () => void }) {
  return (
    <ModalForm
      title="新建订单"
      trigger={<Button type="primary" icon={<PlusOutlined />}>新建订单</Button>}
      width={560}
      grid
      rowProps={{ gutter: 16 }}
      onFinish={async (v) => {
        const res = await api.post('/api/orders', v);
        if (res.success) { message.success(`下单成功，合计 ${res.data?.total}`); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormSelect name="user_id" label="分销商" colProps={{ span: 12 }} request={distributorOptions} showSearch rules={[{ required: true }]} />
      <ProFormSelect
        name="currency"
        label="币种"
        colProps={{ span: 12 }}
        initialValue="RP"
        options={[{ label: '印尼盾 Rp', value: 'RP' }, { label: '人民币 ¥', value: 'RMB' }]}
      />
      <ProFormList
        name="items"
        label="商品明细"
        colProps={{ span: 24 }}
        creatorButtonProps={{ creatorButtonText: '添加商品' }}
        min={1}
        initialValue={[{}]}
      >
        <ProFormSelect name="product_id" label="商品" request={productOptions} showSearch width="md" rules={[{ required: true }]} />
        <ProFormDigit name="qty" label="数量" min={1} initialValue={1} width="xs" />
      </ProFormList>
      <ProFormText name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  );
}
