import { useRef, useState } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormDigit,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { message, Modal, Table, InputNumber } from 'antd';
import { api } from '../api';

interface Level {
  id: number;
  name: string;
  commission_rate: number;
  discount_rate: number;
  sort: number;
}

interface CatRate {
  category_id: number;
  category_name: string;
  commission_rate: number | null;
  discount_rate: number | null;
}

export default function Levels() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Level>[] = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '等级名称', dataIndex: 'name' },
    { title: '默认佣金率', dataIndex: 'commission_rate', render: (_, r) => `${(r.commission_rate * 100).toFixed(1)}%` },
    { title: '默认拿货折扣', dataIndex: 'discount_rate', render: (_, r) => `${(r.discount_rate * 100).toFixed(1)}%` },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, record) => [
        <EditLevel key={`edit-${record.id}`} record={record} onDone={() => actionRef.current?.reload()} />,
        <CategoryRates key={`rates-${record.id}`} level={record} />,
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
      <ProFormDigit name="commission_rate" label="默认佣金率(0~1)" colProps={{ span: 12 }} min={0} max={1} fieldProps={{ step: 0.01 }} />
      <ProFormDigit name="discount_rate" label="默认拿货折扣(0~1)" colProps={{ span: 12 }} min={0} max={1} fieldProps={{ step: 0.01 }} />
      <ProFormDigit name="sort" label="排序" colProps={{ span: 12 }} min={0} />
    </ModalForm>
  );
}

// 分类费率矩阵：每个商品分类单独设置佣金率/拿货折扣（未填则用等级默认值）
function CategoryRates({ level }: { level: Level }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CatRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await api.get(`/api/levels/${level.id}/rates`);
    setRows(
      (res.data || []).map((r: CatRate) => ({
        ...r,
        commission_rate: r.commission_rate ?? level.commission_rate,
        discount_rate: r.discount_rate ?? level.discount_rate,
      }))
    );
    setLoading(false);
  };

  const openModal = () => { setOpen(true); load(); };

  const setCell = (cid: number, key: 'commission_rate' | 'discount_rate', val: number | null) =>
    setRows((rs) => rs.map((r) => (r.category_id === cid ? { ...r, [key]: val } : r)));

  const save = async () => {
    setSaving(true);
    const res = await api.put(`/api/levels/${level.id}/rates`, { rates: rows });
    setSaving(false);
    if (res.success) { message.success('已保存'); setOpen(false); }
    else message.error(res.errorMessage || '失败');
  };

  return (
    <>
      <a onClick={openModal}>分类费率</a>
      <Modal
        title={`分类费率 · ${level.name}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
        width={560}
        destroyOnClose
      >
        <Table<CatRate>
          dataSource={rows}
          rowKey="category_id"
          loading={loading}
          pagination={false}
          size="small"
          columns={[
            { title: '商品分类', dataIndex: 'category_name' },
            {
              title: '佣金率(0~1)', dataIndex: 'commission_rate', width: 170,
              render: (_, r) => (
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }}
                  value={r.commission_rate ?? undefined}
                  onChange={(v) => setCell(r.category_id, 'commission_rate', v)} />
              ),
            },
            {
              title: '拿货折扣(0~1)', dataIndex: 'discount_rate', width: 170,
              render: (_, r) => (
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }}
                  value={r.discount_rate ?? undefined}
                  onChange={(v) => setCell(r.category_id, 'discount_rate', v)} />
              ),
            },
          ]}
        />
      </Modal>
    </>
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
