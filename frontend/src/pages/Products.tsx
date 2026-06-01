import { useRef } from 'react';
import {
  ProTable,
  PageContainer,
  ModalForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
  ProFormUploadButton,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Divider, Image, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { api, getToken } from '../api';

interface Product {
  id: number;
  name: string;
  category_id?: number;
  supplier_id?: number;
  supplier_name?: string;
  brand?: string;
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
  price_taxfree_rp: number;
  bulk_price_rp: number;
  cost_price_rp: number;
  description: string;
  status: number;
}

const rp = (n?: number) => (n == null ? '-' : 'Rp' + Number(n).toLocaleString());

// 数字输入框千分位显示
const moneyProps: any = {
  formatter: (v?: string | number) => (v != null && v !== '' ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser: (v?: string) => (v ? v.replace(/,/g, '') : ''),
};

const categoryOptions = async () => {
  const res = await api.get('/api/categories');
  return (res.data || []).map((c: any) => ({ label: c.name, value: c.id }));
};

const supplierOptions = async () => {
  const res = await api.get('/api/suppliers');
  return (res.data || []).map((s: any) => ({ label: s.name, value: s.id }));
};

const brandOptions = async () => {
  const res = await api.get('/api/product-brands');
  return (res.data || []).map((b: string) => ({ label: b, value: b }));
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
      title: '图片', dataIndex: 'image', width: 96, search: false,
      render: (_, r) => r.image
        ? <Image src={r.image} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 4 }} />
        : <Tag>无</Tag>,
    },
    // 仅用于搜索栏的下拉筛选，不在表格里重复显示
    { title: '分类', dataIndex: 'category_id', valueType: 'select', hideInTable: true,
      request: categoryOptions, fieldProps: { placeholder: '按分类筛选' } },
    { title: '品牌', dataIndex: 'brand', valueType: 'select', hideInTable: true,
      request: brandOptions, fieldProps: { placeholder: '按品牌筛选', showSearch: true } },
    { title: '供应商', dataIndex: 'supplier_id', valueType: 'select', hideInTable: true,
      request: supplierOptions, fieldProps: { placeholder: '按供应商筛选', showSearch: true } },
    { title: '编码', dataIndex: 'product_code', width: 90, search: false },
    { title: '品名', dataIndex: 'name', ellipsis: true },
    { title: '品牌', dataIndex: 'brand', width: 90, search: false,
      render: (_, r) => (r.brand ? <Tag color="blue">{r.brand}</Tag> : '-') },
    { title: '分类', dataIndex: 'category_name', width: 80, search: false,
      render: (_, r: any) => <Tag color="green">{r.category_name}</Tag> },
    { title: '供应商', dataIndex: 'supplier_name', width: 100, search: false,
      render: (_, r) => r.supplier_name || '-' },
    { title: '规格', dataIndex: 'spec', width: 100, search: false },
    { title: '产地', dataIndex: 'origin', width: 110, search: false },
    { title: '包装数量', dataIndex: 'qty_per_box', width: 80, search: false },
    { title: '单价(¥)', dataIndex: 'price_rmb', width: 90, search: false,
      render: (_, r) => (r.price_rmb ? `¥${r.price_rmb}` : '-') },
    { title: '含税价(Rp)', dataIndex: 'box_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.box_price_rp) },
    { title: '免税价(Rp)', dataIndex: 'price_taxfree_rp', width: 120, search: false,
      render: (_, r) => rp(r.price_taxfree_rp) },
    { title: '不含税成本', dataIndex: 'bulk_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.bulk_price_rp) },
    { title: '含税成本', dataIndex: 'cost_price_rp', width: 120, search: false,
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
              (params.category_id ? `&category_id=${params.category_id}` : '') +
              (params.brand ? `&brand=${encodeURIComponent(params.brand)}` : '') +
              (params.supplier_id ? `&supplier_id=${params.supplier_id}` : '')
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
      width={720}
      grid
      rowProps={{ gutter: 16 }}
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
      <Divider orientation="left" plain style={{ marginTop: 0 }}>基本信息</Divider>
      <ProFormText name="name" label="品名" colProps={{ span: 16 }} rules={[{ required: true }]} />
      <ProFormSelect name="status" label="状态" colProps={{ span: 8 }}
        options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]} />
      <ProFormSelect name="category_id" label="分类" colProps={{ span: 8 }} request={categoryOptions} />
      <ProFormText name="brand" label="品牌" colProps={{ span: 8 }} />
      <ProFormSelect name="supplier_id" label="供应商" colProps={{ span: 8 }} request={supplierOptions} showSearch />
      <ProFormText name="product_code" label="编码" colProps={{ span: 8 }} />
      <ProFormText name="barcode" label="条码" colProps={{ span: 8 }} />

      <Divider orientation="left" plain>规格</Divider>
      <ProFormText name="spec" label="规格" colProps={{ span: 8 }} />
      <ProFormText name="origin" label="产地" colProps={{ span: 8 }} />
      <ProFormText name="unit" label="单位" colProps={{ span: 4 }} />
      <ProFormDigit name="qty_per_box" label="包装数量" colProps={{ span: 4 }} min={0} />

      <Divider orientation="left" plain>价格</Divider>
      <ProFormDigit name="box_price_rp" label="含税价/零售价(Rp)" colProps={{ span: 8 }} min={0} fieldProps={moneyProps} />
      <ProFormDigit name="price_taxfree_rp" label="免税价(Rp)" colProps={{ span: 8 }} min={0} fieldProps={moneyProps} />
      <ProFormDigit name="bulk_price_rp" label="不含税成本(Rp)" colProps={{ span: 8 }} min={0} fieldProps={moneyProps} />
      <ProFormDigit name="cost_price_rp" label="含税成本(Rp)" colProps={{ span: 8 }} min={0} fieldProps={moneyProps} />
      <ProFormDigit name="price_rmb" label="单价(¥)" colProps={{ span: 8 }} min={0} fieldProps={moneyProps} />

      <Divider orientation="left" plain>图片 / 备注</Divider>
      <ProFormUploadButton
        name="image"
        label="商品图片"
        max={1}
        colProps={{ span: 24 }}
        fieldProps={{
          name: 'file',
          listType: 'picture-card',
          accept: 'image/*',
          action: '/api/upload',
          headers: { Authorization: `Bearer ${getToken()}` },
        }}
        extra="支持 jpg/png/gif/webp，≤5MB"
      />
      <ProFormTextArea name="description" label="备注" colProps={{ span: 24 }} />
    </ModalForm>
  );
}
