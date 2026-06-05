import { useRef, useState } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Table, Select, message, Tag } from 'antd';
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
      width: 130,
      render: (_, record) => [
        <EditDistributor key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
        <QuoteButton key="quote" dist={record} />,
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
      <ProFormText name="group_no" label="群编号" colProps={{ span: 12 }} readonly tooltip="系统自动生成，不可修改" />
      <ProFormText.Password name="password" label="重置密码" colProps={{ span: 12 }} placeholder="留空则不修改" />
      <ProFormSelect name="status" label="状态" colProps={{ span: 12 }}
        options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
      <ProFormSelect name="level_id" label="分销等级" colProps={{ span: 12 }} request={levelOptions} />
      <ProFormSelect name="parent_id" label="推广上级" colProps={{ span: 12 }} request={parentOptions} showSearch />
    </ModalForm>
  );
}

const fmt = (n: number | null | undefined) => (n == null ? '-' : Number(n).toLocaleString());
const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]));

// 按等级出报价单（价目表）：让分销商知道含税/不含税拿货价，导出品牌 PDF
function QuoteButton({ dist }: { dist: Distributor }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setOpen(true);
    setLoading(true);
    setCats([]);
    const res = await api.get(`/api/distributors/${dist.id}/quote`);
    setItems((res.data?.items || []).map((it: any, idx: number) => ({ ...it, _k: idx })));
    setLoading(false);
  };

  const catOptions = Array.from(new Set(items.map((i) => i.category_name).filter(Boolean)))
    .map((c) => ({ label: c, value: c }));
  const shown = cats.length ? items.filter((i) => cats.includes(i.category_name)) : items;

  const exportPDF = () => {
    if (!shown.length) { message.warning('没有可导出的商品'); return; }
    const d = new Date();
    const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    const rows = shown.map((i, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td>${esc(i.name)}</td>
        <td class="c">${esc(i.spec || '')}</td>
        <td class="r">${fmt(i.taxed_price)}</td>
        <td class="r">${fmt(i.free_price)}</td>
        <td>${esc(i.brand || '')}</td>
      </tr>`).join('');
    const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>报价单 ${esc(dist.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei","PingFang SC","Helvetica Neue",Arial,sans-serif; color:#1a1a1a; margin:0; padding:32px 40px; }
  .head { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:16px; border-bottom:3px solid #1a1a1a; }
  .brand .cn { font-size:24px; font-weight:800; letter-spacing:2px; }
  .brand .en { font-size:12px; color:#888; letter-spacing:3px; }
  .title { text-align:right; }
  .title .cn { font-size:24px; font-weight:800; }
  .title .en { font-size:12px; color:#888; letter-spacing:3px; }
  .info { display:flex; justify-content:space-between; margin:14px 0; font-size:13px; color:#333; }
  .info .r { text-align:right; line-height:1.7; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { border:1px solid #d9d9d9; padding:8px 10px; vertical-align:top; }
  thead th { background:#eef0f4; font-weight:700; text-align:center; }
  td.c { text-align:center; } td.r { text-align:right; }
  .notes { margin-top:18px; font-size:12px; color:#444; line-height:1.9; border-top:1px solid #eee; padding-top:12px; }
  .notes b { color:#1a1a1a; }
  @media print { body { padding:12px 16px; } @page { margin:12mm; } }
</style></head><body>
  <div class="head">
    <div class="brand"><div class="cn">斑兔企服</div><div class="en">BANTUQIFU</div></div>
    <div class="title"><div class="cn">报价单</div><div class="en">QUOTATION</div></div>
  </div>
  <div class="info">
    <div>客户: ${esc(dist.name || dist.username)}</div>
    <div class="r">日期: ${date}<br>货币: IDR（印尼盾）</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:42px">序号</th><th>商品名称</th><th style="width:100px">规格</th>
      <th style="width:130px">含税价</th><th style="width:130px">不含税价</th><th style="width:100px">备注</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="notes">
    * 价格单位：印尼盾(IDR)<br>
    * 以上报价有效期为 30 天，最终以签约/订单为准<br>
    * 本报价单由斑兔企服出具<br>
    <b>含税价为含税到手价；不含税价不含税费，税费由客户方承担。</b>
  </div>
</body></html>`;
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) { message.error('请允许浏览器弹出窗口后重试'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  return (
    <>
      <a onClick={load}>报价单</a>
      <Modal
        title={`报价单 · ${dist.name || dist.username}（${dist.level_name || '无等级'}）`}
        open={open}
        width={760}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="dl" type="primary" disabled={!shown.length} onClick={exportPDF}>导出 PDF</Button>,
          <Button key="close" onClick={() => setOpen(false)}>关闭</Button>,
        ]}
      >
        <Select
          mode="multiple"
          allowClear
          placeholder="按商品分类筛选（不选=全部）"
          style={{ width: '100%', marginBottom: 12 }}
          value={cats}
          onChange={setCats}
          options={catOptions}
        />
        <Table
          dataSource={shown}
          rowKey="_k"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 440 }}
          columns={[
            { title: '商品名称', dataIndex: 'name' },
            { title: '规格', dataIndex: 'spec', width: 100 },
            { title: '含税价', dataIndex: 'taxed_price', width: 130, align: 'right', render: (v) => fmt(v) },
            { title: '不含税价', dataIndex: 'free_price', width: 130, align: 'right', render: (v) => fmt(v) },
          ]}
        />
      </Modal>
    </>
  );
}
