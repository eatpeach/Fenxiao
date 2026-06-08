import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

interface Account {
  id: number;
  username: string;
  name: string;
  status: number;
  created_at: string;
}

export default function Accounts() {
  const actionRef = useRef<ActionType>();

  const remove = async (id: number) => {
    const res = await api.del(`/api/accounts/${id}`);
    if (res.success) { message.success('已删除'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Account>[] = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status', width: 90,
      render: (_, r) => r.status ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
    { title: '创建时间', dataIndex: 'created_at', width: 170 },
    {
      title: '操作', valueType: 'option', width: 130,
      render: (_, record) => [
        <EditAccount key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
        <Popconfirm key="del" title="确认删除该账号？" onConfirm={() => remove(record.id)}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="账号管理" subTitle="后台登录账号（可多账户）">
      <ProTable<Account>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        pagination={false}
        request={async () => {
          const res = await api.get('/api/accounts');
          return { data: res.data || [], success: res.success };
        }}
        toolBarRender={() => [
          <CreateAccount key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function CreateAccount({ onDone }: { onDone: () => void }) {
  return (
    <ModalForm
      title="新增账号"
      trigger={<Button type="primary" icon={<PlusOutlined />}>新增账号</Button>}
      width={460}
      grid
      rowProps={{ gutter: 16 }}
      onFinish={async (v) => {
        const res = await api.post('/api/accounts', v);
        if (res.success) { message.success('已新增'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormText name="username" label="用户名" colProps={{ span: 12 }} rules={[{ required: true }]} />
      <ProFormText.Password name="password" label="密码" colProps={{ span: 12 }} rules={[{ required: true }]} />
      <ProFormText name="name" label="姓名" colProps={{ span: 24 }} />
    </ModalForm>
  );
}

function EditAccount({ record, onDone }: { record: Account; onDone: () => void }) {
  return (
    <ModalForm
      title="编辑账号"
      trigger={<a>编辑</a>}
      width={460}
      grid
      rowProps={{ gutter: 16 }}
      initialValues={record}
      onFinish={async (v) => {
        const res = await api.put(`/api/accounts/${record.id}`, v);
        if (res.success) { message.success('已保存'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormText name="name" label="姓名" colProps={{ span: 12 }} />
      <ProFormSelect name="status" label="状态" colProps={{ span: 12 }}
        options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
      <ProFormText.Password name="password" label="重置密码" colProps={{ span: 24 }} placeholder="留空则不修改" />
    </ModalForm>
  );
}
