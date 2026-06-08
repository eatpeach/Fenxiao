import { useRef, useState } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormTextArea,
  ProFormDatePicker,
  ProFormDependency,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Timeline, Input, Select, DatePicker, Tag, Popconfirm, Empty, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api } from '../api';

interface Opp {
  id: number;
  name: string;
  type: string;
  contact?: string;
  level_id?: number;
  level_name?: string;
  source?: string;
  stage: string;
  intent?: string;
  amount?: number;
  owner?: string;
  next_follow_at?: string;
  remark?: string;
  follow_count?: number;
  created_at: string;
}

const TYPE: Record<string, { text: string; color: string }> = {
  direct: { text: '直接客户(原价)', color: 'geekblue' },
  distributor: { text: '分销客户(按分销)', color: 'gold' },
};
const STAGE: Record<string, { text: string; color: string }> = {
  new: { text: '新建', color: 'default' },
  following: { text: '跟进中', color: 'processing' },
  won: { text: '已成交', color: 'success' },
  lost: { text: '已流失', color: 'error' },
};
const stageOptions = Object.entries(STAGE).map(([value, v]) => ({ label: v.text, value }));
const typeOptions = Object.entries(TYPE).map(([value, v]) => ({ label: v.text, value }));

const levelOptions = async () => {
  const res = await api.get('/api/levels');
  return (res.data || []).map((l: any) => ({ label: l.name, value: l.id }));
};

export default function Opportunities() {
  const actionRef = useRef<ActionType>();

  const remove = async (id: number) => {
    const res = await api.del(`/api/opportunities/${id}`);
    if (res.success) { message.success('已删除'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Opp>[] = [
    { title: '客户名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', valueType: 'select',
      fieldProps: { options: typeOptions, placeholder: '全部类型' },
      render: (_, r) => <Tag color={TYPE[r.type]?.color}>{TYPE[r.type]?.text || r.type}</Tag> },
    { title: '等级', dataIndex: 'level_name', search: false,
      render: (_, r) => (r.type === 'distributor' ? (r.level_name ? <Tag color="gold">{r.level_name}</Tag> : '-') : '—') },
    { title: '联系方式', dataIndex: 'contact', search: false },
    { title: '阶段', dataIndex: 'stage', valueType: 'select',
      fieldProps: { options: stageOptions, placeholder: '全部阶段' },
      render: (_, r) => <Tag color={STAGE[r.stage]?.color}>{STAGE[r.stage]?.text || r.stage}</Tag> },
    { title: '预估金额', dataIndex: 'amount', search: false,
      render: (_, r) => (r.amount ? Number(r.amount).toLocaleString() : '-') },
    { title: '负责人', dataIndex: 'owner', search: false },
    { title: '下次跟进', dataIndex: 'next_follow_at', search: false, render: (_, r) => r.next_follow_at || '-' },
    {
      title: '操作', valueType: 'option', width: 170,
      render: (_, record) => [
        <FollowModal key="follow" opp={record} onDone={() => actionRef.current?.reload()} />,
        <OppForm key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
        <Popconfirm key="del" title="确认删除该商机？" onConfirm={() => remove(record.id)}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="商机管理">
      <ProTable<Opp>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const res = await api.get(
            `/api/opportunities?current=${params.current}&pageSize=${params.pageSize}` +
              (params.name ? `&name=${encodeURIComponent(params.name)}` : '') +
              (params.type ? `&type=${params.type}` : '') +
              (params.stage ? `&stage=${params.stage}` : '')
          );
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        toolBarRender={() => [
          <OppForm key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function OppForm({ record, onDone }: { record?: Opp; onDone: () => void }) {
  const isEdit = !!record;
  return (
    <ModalForm
      title={isEdit ? '编辑商机' : '新增商机'}
      width={620}
      grid
      rowProps={{ gutter: 16 }}
      trigger={isEdit ? <a>编辑</a> : <Button type="primary" icon={<PlusOutlined />}>新增商机</Button>}
      initialValues={isEdit ? record : { type: 'direct', stage: 'new' }}
      onFinish={async (v) => {
        const res = isEdit
          ? await api.put(`/api/opportunities/${record!.id}`, v)
          : await api.post('/api/opportunities', v);
        if (res.success) { message.success(isEdit ? '已保存' : '已新增'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProFormText name="name" label="客户名称" colProps={{ span: 12 }} rules={[{ required: true }]} />
      <ProFormText name="contact" label="联系方式" colProps={{ span: 12 }} />
      <ProFormSelect name="type" label="客户类型" colProps={{ span: 12 }} options={typeOptions}
        initialValue="direct" allowClear={false} />
      <ProFormDependency name={['type']}>
        {({ type }) =>
          type === 'distributor'
            ? <ProFormSelect name="level_id" label="分销等级(定价)" colProps={{ span: 12 }} request={levelOptions} />
            : <ProFormText name="source" label="来源" colProps={{ span: 12 }} />
        }
      </ProFormDependency>
      <ProFormSelect name="stage" label="阶段" colProps={{ span: 12 }} options={stageOptions} initialValue="new" allowClear={false} />
      <ProFormText name="owner" label="负责人" colProps={{ span: 12 }} />
      <ProFormDigit name="amount" label="预估金额" colProps={{ span: 12 }} min={0} />
      <ProFormDatePicker name="next_follow_at" label="下次跟进" colProps={{ span: 12 }} fieldProps={{ style: { width: '100%' } }} />
      <ProFormText name="intent" label="意向商品/需求" colProps={{ span: 24 }} />
      <ProFormTextArea name="remark" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  );
}

function FollowModal({ opp, onDone }: { opp: Opp; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [next, setNext] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const res = await api.get(`/api/opportunities/${opp.id}`);
    setDetail(res.data || null);
    setStage(res.data?.stage);
    setLoading(false);
  };
  const openModal = () => { setOpen(true); setContent(''); setNext(''); load(); };

  const submit = async () => {
    if (!content.trim()) { message.warning('请填写跟进内容'); return; }
    const res = await api.post(`/api/opportunities/${opp.id}/follows`, { content, stage, next_follow_at: next });
    if (res.success) { message.success('已记录'); setContent(''); load(); onDone(); }
    else message.error(res.errorMessage || '失败');
  };

  const o = detail || opp;
  return (
    <>
      <a onClick={openModal}>跟进</a>
      <Modal title={`跟进 · ${opp.name}`} open={open} width={640} onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>关闭</Button>}>
        <div style={{ marginBottom: 12, color: '#666' }}>
          <Tag color={TYPE[o.type]?.color}>{TYPE[o.type]?.text}</Tag>
          {o.type === 'distributor' && o.level_name ? <Tag color="gold">{o.level_name}</Tag> : null}
          <Tag color={STAGE[o.stage]?.color}>{STAGE[o.stage]?.text}</Tag>
          {o.contact ? <span style={{ marginLeft: 8 }}>联系方式：{o.contact}</span> : null}
        </div>

        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <Input.TextArea rows={2} placeholder="本次跟进内容…" value={content} onChange={(e) => setContent(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>更新阶段</span>
            <Select style={{ width: 120 }} value={stage} options={stageOptions} onChange={setStage} />
            <span>下次跟进</span>
            <DatePicker onChange={(_, ds) => setNext(ds as string)} />
            <Button type="primary" onClick={submit}>提交跟进</Button>
          </div>
        </div>

        {loading ? null : (o.follows && o.follows.length ? (
          <Timeline
            items={o.follows.map((f: any) => ({
              children: <><div>{f.content}</div><div style={{ color: '#aaa', fontSize: 12 }}>{f.created_at}</div></>,
            }))}
          />
        ) : <Empty description="暂无跟进记录" />)}
      </Modal>
    </>
  );
}
