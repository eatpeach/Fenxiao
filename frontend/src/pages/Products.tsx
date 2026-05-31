import { useRef } from 'react';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { api } from '../api';

interface Product {
  id: number;
  name: string;
  product_code: string;
  spec: string;
  origin: string;
  category_name: string;
  qty_per_box: number;
  price_rmb: number;
  box_price_rp: number;
  bulk_price_rp: number;
  status: number;
}

const rp = (n?: number) => (n == null ? '-' : 'Rp' + Number(n).toLocaleString());

export default function Products() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<Product>[] = [
    { title: '编码', dataIndex: 'product_code', width: 90, search: false },
    { title: '品名', dataIndex: 'name', ellipsis: true },
    { title: '分类', dataIndex: 'category_name', width: 80, search: false,
      render: (_, r) => <Tag color="green">{r.category_name}</Tag> },
    { title: '规格', dataIndex: 'spec', width: 100, search: false },
    { title: '产地', dataIndex: 'origin', width: 110, search: false },
    { title: '一盒数量', dataIndex: 'qty_per_box', width: 80, search: false },
    { title: '单价(¥)', dataIndex: 'price_rmb', width: 90, search: false,
      render: (_, r) => (r.price_rmb ? `¥${r.price_rmb}` : '-') },
    { title: '一盒价(Rp)', dataIndex: 'box_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.box_price_rp) },
    { title: '批量拿货价', dataIndex: 'bulk_price_rp', width: 120, search: false,
      render: (_, r) => rp(r.bulk_price_rp) },
  ];

  return (
    <PageContainer title="商品管理">
      <ProTable<Product>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1000 }}
        request={async (params) => {
          const res = await api.get(
            `/api/products?current=${params.current}&pageSize=${params.pageSize}` +
              (params.name ? `&name=${encodeURIComponent(params.name)}` : '')
          );
          return { data: res.data || [], success: res.success, total: res.total };
        }}
        pagination={{ pageSize: 20 }}
      />
    </PageContainer>
  );
}
