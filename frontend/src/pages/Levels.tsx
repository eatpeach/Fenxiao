import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormDigit,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { message } from 'antd';
import { api } from '../api';

interface Level {
  id: number;
  name: string;
  commission_rate: number;
  discount_rate: number;
  sort: number;
}

export default function Levels() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Level>[] = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '等级名称', dataIndex: 'name' },
    { title: '佣金率', dataIndex: 'commission_rate', render: (_, r) => `${(r.commission_rate * 100).toFixed(1)}%` },
    { title: '拿货折扣', dataIndex: 'discount_rate', render: (_, r) => `${(r.discount_rate * 100).toFixed(1)}%` },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <EditLevel key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
      ],
    },
  ];

  return (
    <PageContainer title="分销商等级">
      <ProTable<Level>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        pagination={false}
        request={async () => {
          const res = await api.get('/api/levels');
          return { data: res.data || [], success: res.success };
        }}
      />
    </PageContainer>
  );
}

function LevelForm({
  trigger,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactElement;
  initialValues?: Partial<Level>;
  onSubmit: (v: any) => Promise<boolean>;
}) {
  return (
    <ModalForm title="分销商等级" trigger={trigger} initialValues={initialValues} onFinish={onSubmit}
      width={480} grid rowProps={{ gutter: 16 }}>
      <ProFormText name="name" label="等级名称" colProps={{ span: 24 }} rules={[{ required: true }]} />
      <ProFormDigit name="commission_rate" label="佣金率(0~1)" colProps={{ span: 12 }} min={0} max={1} fieldProps={{ step: 0.01 }} />
      <ProFormDigit name="discount_rate" label="拿货折扣(0~1)" colProps={{ span: 12 }} min={0} max={1} fieldProps={{ step: 0.01 }} />
      <ProFormDigit name="sort" label="排序" colProps={{ span: 12 }} min={0} />
    </ModalForm>
  );
}

function EditLevel({ record, onDone }: { record: Level; onDone: () => void }) {
  return (
    <LevelForm
      trigger={<a>编辑</a>}
      initialValues={record}
      onSubmit={async (v) => {
        const res = await api.put(`/api/levels/${record.id}`, v);
        if (res.success) { message.success('已保存'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    />
  );
}
