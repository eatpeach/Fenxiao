import { useEffect, useState } from 'react';
import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { api } from '../api';

export default function Dashboard() {
  const [productTotal, setProductTotal] = useState(0);
  const [categoryTotal, setCategoryTotal] = useState(0);

  useEffect(() => {
    api.get('/api/products?current=1&pageSize=1').then((r) => setProductTotal(r.total || 0));
    api.get('/api/categories').then((r) => setCategoryTotal((r.data || []).length));
  }, []);

  return (
    <PageContainer title="工作台">
      <StatisticCard.Group>
        <StatisticCard statistic={{ title: '商品总数', value: productTotal }} />
        <StatisticCard statistic={{ title: '商品分类', value: categoryTotal }} />
        <StatisticCard statistic={{ title: '分销商', value: '—' }} />
        <StatisticCard statistic={{ title: '待结算佣金', value: '—' }} />
      </StatisticCard.Group>
    </PageContainer>
  );
}
