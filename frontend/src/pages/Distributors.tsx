import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

interface Distributor {
  id: number;
  username: string;
  name: string;
  phone: string;
  group_no?: string;
  level_id?: number;
  parent_id?: number;
  level_name?: string;
  parent_name?: string;
  balance: number;
  status: number;
}

// 群名格式：[斑兔分销 1001] 客户名
const groupName = (g?: string, name?: string) =>
  g ? `[斑兔分销 ${g}] ${name || ''}`.trim() : '-';

const levelOptions = async () => {
  const res = await api.get('/api/levels');
  return (res.data || []).map((l: any) => ({ label: l.name, value: l.id }));
};
const parentOptions = async () => {
  const res = await api.get('/api/distributors?pageSize=100');
  return (res.data || []).map((d: any) => ({ label: `${d.name}(${d.username})`, value: d.id }));
};

export default function Distributors() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Distributor>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '姓名/用户名', dataIndex: 'name', render: (_, r) => `${r.name || '-'} (${r.username})` },
    { title: '群编号', dataIndex: 'group_no', width: 90, search: false, render: (_, r) => r.group_no || '-' },
    { title: '群名', dataIndex: 'group_name', search: false,
      render: (_, r) => groupName(r.group_no, r.name) },
    { title: '手机', dataIndex: 'phone', search: false },
    { title: '等级', dataIndex: 'level_name', search: false, render: (_, r) => r.level_name ? <Tag color="gold">{r.level_name}</Tag> : '-' },
    { title: '推广上级', dataIndex: 'parent_name', search: false, render: (_, r) => r.parent_name || '-' },
    { title: '余额', dataIndex: 'balance', search: false, render: (_, r) => Number(r.balance || 0).toLocaleString() },
    { title: '状态', dataIndex: 'status', search: false, render: (_, r) => r.status ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => [
        <EditDistributor key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
      ],
    },
  ];

  return (
    <PageContainer title="分销商管理">
      <ProTable<Distributor>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const res = await api.get(
            `/api/distributors?current=${params.current}&pageSize=${params.pageSize}` +
              (params.name ? `&name=${encodeURIComponent(params.name)}` : '')
          );
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        toolBarRender={() => [
          <CreateDistributor key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function CreateDistributor({ onDone }: { onDone: () => void }) {
  return (
    <ModalForm
      title="新增分销商"
      trigger={<Button type="primary" icon={<PlusOutlined />}>新增分销商</Button>}
      width={560}
      grid
      rowProps={{ gutter: 16 }}
      onFinish={async (v) => {
        const res = await api.post('/api/distributors', v);
        if (res.success) { message.success('已新增'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormText name="username" label="用户名" colProps={{ span: 12 }} rules={[{ required: true }]} />
      <ProFormText.Password name="password" label="密码" colProps={{ span: 12 }} rules={[{ required: true }]} />
      <ProFormText name="name" label="姓名(客户名)" colProps={{ span: 12 }} />
      <ProFormText name="phone" label="手机" colProps={{ span: 12 }} />
      <ProFormText name="group_no" label="群编号" colProps={{ span: 12 }} placeholder="如 1001" />
      <ProFormSelect name="level_id" label="分销等级" colProps={{ span: 12 }} request={levelOptions} />
      <ProFormSelect name="parent_id" label="推广上级" colProps={{ span: 12 }} request={parentOptions} showSearch />
    </ModalForm>
  );
}

function EditDistributor({ record, onDone }: { record: Distributor; onDone: () => void }) {
  return (
    <ModalForm
      title="编辑分销商"
      trigger={<a>编辑</a>}
      width={560}
      grid
      rowProps={{ gutter: 16 }}
      initialValues={record}
      onFinish={async (v) => {
        const res = await api.put(`/api/distributors/${record.id}`, v);
        if (res.success) { message.success('已保存'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormText name="name" label="姓名(客户名)" colProps={{ span: 12 }} />
      <ProFormText name="phone" label="手机" colProps={{ span: 12 }} />
      <ProFormText name="group_no" label="群编号" colProps={{ span: 12 }} placeholder="如 1001" />
      <ProFormText.Password name="password" label="重置密码" colProps={{ span: 12 }} placeholder="留空则不修改" />
      <ProFormSelect name="status" label="状态" colProps={{ span: 12 }}
        options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
      <ProFormSelect name="level_id" label="分销等级" colProps={{ span: 12 }} request={levelOptions} />
      <ProFormSelect name="parent_id" label="推广上级" colProps={{ span: 12 }} request={parentOptions} showSearch />
    </ModalForm>
  );
}
