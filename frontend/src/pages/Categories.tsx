import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { api } from '../api';

interface Category {
  id: number;
  name: string;
  sort: number;
  product_count: number;
}

export default function Categories() {
  const columns: ProColumns<Category>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '分类名称', dataIndex: 'name' },
    { title: '商品数', dataIndex: 'product_count', width: 120 },
    { title: '排序', dataIndex: 'sort', width: 80 },
  ];

  return (
    <PageContainer title="商品分类">
      <ProTable<Category>
        rowKey="id"
        columns={columns}
        search={false}
        pagination={false}
        request={async () => {
          const res = await api.get('/api/categories');
          return { data: res.data || [], success: res.success };
        }}
      />
    </PageContainer>
  );
}
