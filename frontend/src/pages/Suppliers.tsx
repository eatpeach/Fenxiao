import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormDigit,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  remark: string;
  sort: number;
  product_count: number;
}

export default function Suppliers() {
  const actionRef = useRef<ActionType>();

  const remove = async (id: number) => {
    const res = await api.del(`/api/suppliers/${id}`);
    if (res.success) { message.success('已删除'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Supplier>[] = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '供应商名称', dataIndex: 'name' },
    { title: '联系人', dataIndex: 'contact', width: 120 },
    { title: '电话', dataIndex: 'phone', width: 150 },
    { title: '商品数', dataIndex: 'product_count', width: 90 },
    { title: '备注', dataIndex: 'remark' },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <EditSupplier key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
        <Popconfirm key="del" title="确认删除该供应商？" onConfirm={() => remove(record.id)}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="供应商管理">
      <ProTable<Supplier>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        pagination={false}
        request={async () => {
          const res = await api.get('/api/suppliers');
          return { data: res.data || [], success: res.success };
        }}
        toolBarRender={() => [
          <CreateSupplier key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function SupplierForm({
  trigger,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactElement;
  initialValues?: Partial<Supplier>;
  onSubmit: (v: any) => Promise<boolean>;
}) {
  return (
    <ModalForm title="供应商" trigger={trigger} initialValues={initialValues} onFinish={onSubmit}
      width={480} grid rowProps={{ gutter: 16 }}>
      <ProFormText name="name" label="供应商名称" colProps={{ span: 24 }} rules={[{ required: true }]} />
      <ProFormText name="contact" label="联系人" colProps={{ span: 12 }} />
      <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
      <ProFormText name="remark" label="备注" colProps={{ span: 18 }} />
      <ProFormDigit name="sort" label="排序" colProps={{ span: 6 }} min={0} />
    </ModalForm>
  );
}

function CreateSupplier({ onDone }: { onDone: () => void }) {
  return (
    <SupplierForm
      trigger={<Button type="primary" icon={<PlusOutlined />}>新增供应商</Button>}
      onSubmit={async (v) => {
        const res = await api.post('/api/suppliers', v);
        if (res.success) { message.success('已新增'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    />
  );
}

function EditSupplier({ record, onDone }: { record: Supplier; onDone: () => void }) {
  return (
    <SupplierForm
      trigger={<a>编辑</a>}
      initialValues={record}
      onSubmit={async (v) => {
        const res = await api.put(`/api/suppliers/${record.id}`, v);
        if (res.success) { message.success('已保存'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    />
  );
}
