import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
  ProFormUploadButton,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Image, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, getToken } from '../api';

interface Product {
  id: number;
  name: string;
  category_id?: number;
  product_code: string;
  barcode: string;
  spec: string;
  origin: string;
  unit: string;
  image?: string;
  qty_per_box: number;
  price_per_brew_rp: number;
  price_rmb: number;
  box_price_rp: number;
  bulk_price_rp: number;
  cost_price_rp: number;
  description: string;
  status: number;
}

const rp = (n?: number) => (n == null ? '-' : 'Rp' + Number(n).toLocaleString());

const categoryOptions = async () => {
  const res = await api.get('/api/categories');
  return (res.data || []).map((c: any) => ({ label: c.name, value: c.id }));
};

// 图片字段 <-> antd Upload fileList 互转
const urlToFileList = (url?: string) =>
  url ? [{ uid: '-1', name: '图片', status: 'done', url }] : [];
const fileListToUrl = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const f = Array.isArray(v) ? v[0] : v;
  return f?.response?.data?.url || f?.url || '';
};

export default function Products() {
  const actionRef = useRef<ActionType>();

  const remove = async (id: number) => {
    const res = await api.del(`/api/products/${id}`);
    if (res.success) { message.success('已删除'); actionRef.current?.reload(); }
    else message.error(res.errorMessage || '失败');
  };

  const columns: ProColumns<Product>[] = [
    {
      title: '图片', dataIndex: 'image', width: 70, search: false,
      render: (_, r) => r.image
        ? <Image src={r.image} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 4 }} />
        : <Tag>无</Tag>,
    },
    // 仅用于搜索栏的分类下拉，不在表格里重复显示
    { title: '分类', dataIndex: 'category_id', valueType: 'select', hideInTable: true,
      request: categoryOptions, fieldProps: { placeholder: '按分类筛选' } },
    { title: '编码', dataIndex: 'product_code', width: 90, search: false },
    { title: '品名', dataIndex: 'name', ellipsis: true },
    { title: '分类', dataIndex: 'category_name', width: 80, search: false,
      render: (_, r: any) => <Tag color="green">{r.category_name}</Tag> },
    { title: '规格', dataIndex: 'spec', width: 100, search: false },
    { title: '产地', dataIndex: 'origin', width: 110, search: false },
    { title: '一盒数量', dataIndex: 'qty_per_box', width: 80, search: false },
    { title: '单泡价(Rp)', dataIndex: 'price_per_brew_rp', width: 110, search: false,
      render: (_, r) => rp(r.price_per_brew_rp) },
    { title: '单价(¥)', dataIndex: 'price_rmb', width: 90, search: false,
      render: (_, r) => (r.price_rmb ? `¥${r.price_rmb}` : '-') },
    { title: '一盒价(Rp)', dataIndex: 'box_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.box_price_rp) },
    { title: '批量拿货价', dataIndex: 'bulk_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.bulk_price_rp) },
    { title: '成本价', dataIndex: 'cost_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.cost_price_rp) },
    {
      title: '操作', valueType: 'option', width: 110, fixed: 'right',
      render: (_, record) => [
        <ProductForm key="edit" record={record} onDone={() => actionRef.current?.reload()} />,
        <Popconfirm key="del" title="确认删除该商品？" onConfirm={() => remove(record.id)}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="商品管理">
      <ProTable<Product>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1500 }}
        request={async (params) => {
          const res = await api.get(
            `/api/products?current=${params.current}&pageSize=${params.pageSize}` +
              (params.name ? `&name=${encodeURIComponent(params.name)}` : '') +
              (params.category_id ? `&category_id=${params.category_id}` : '')
          );
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        pagination={{ pageSize: 20 }}
        toolBarRender={() => [
          <ProductForm key="create" onDone={() => actionRef.current?.reload()} />,
        ]}
      />
    </PageContainer>
  );
}

function ProductForm({ record, onDone }: { record?: Product; onDone: () => void }) {
  const isEdit = !!record;
  return (
    <ModalForm
      title={isEdit ? '编辑商品' : '新增商品'}
      width={760}
      trigger={isEdit
        ? <a>编辑</a>
        : <Button type="primary" icon={<PlusOutlined />}>新增商品</Button>}
      initialValues={isEdit ? { ...record, image: urlToFileList(record!.image) } : { status: 1 }}
      onFinish={async (values) => {
        const payload = { ...values, image: fileListToUrl(values.image) };
        const res = isEdit
          ? await api.put(`/api/products/${record!.id}`, payload)
          : await api.post('/api/products', payload);
        if (res.success) { message.success(isEdit ? '已保存' : '已新增'); onDone(); return true; }
        message.error(res.errorMessage || '失败');
        return false;
      }}
    >
      <ProForm.Group>
        <ProFormText name="name" label="品名" width="md" rules={[{ required: true }]} />
        <ProFormSelect name="category_id" label="分类" width="sm" request={categoryOptions} />
        <ProFormSelect name="status" label="状态" width="xs"
          options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]} />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText name="product_code" label="编码" width="sm" />
        <ProFormText name="barcode" label="条码" width="sm" />
        <ProFormText name="spec" label="规格" width="sm" />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText name="origin" label="产地" width="sm" />
        <ProFormText name="unit" label="单位" width="xs" />
        <ProFormDigit name="qty_per_box" label="一盒数量" width="xs" min={0} />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormDigit name="price_per_brew_rp" label="单泡价(Rp)" width="xs" min={0} />
        <ProFormDigit name="price_rmb" label="单价(¥)" width="xs" min={0} />
        <ProFormDigit name="box_price_rp" label="一盒价(Rp)" width="xs" min={0} />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormDigit name="bulk_price_rp" label="批量拿货价(Rp)" width="sm" min={0} />
        <ProFormDigit name="cost_price_rp" label="成本价(Rp)" width="sm" min={0} />
      </ProForm.Group>
      <ProFormUploadButton
        name="image"
        label="商品图片"
        max={1}
        fieldProps={{
          name: 'file',
          listType: 'picture-card',
          accept: 'image/*',
          action: '/api/upload',
          headers: { Authorization: `Bearer ${getToken()}` },
        }}
        extra="支持 jpg/png/gif/webp，≤5MB"
      />
      <ProFormTextArea name="description" label="备注" />
    </ModalForm>
  );
}
