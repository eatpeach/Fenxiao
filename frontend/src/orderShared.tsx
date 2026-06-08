import { useState } from 'react';
import { Modal, Table, Button, InputNumber, Upload, Image, Popconfirm, Tag, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { api, getToken } from './api';

export const curSym = (o: any) => (o?.currency === 'RMB' ? '¥' : 'Rp');
export const money = (o: any, n: any) => `${curSym(o)}${Number(n || 0).toLocaleString()}`;

export function payStatus(o: any): { text: string; color: string } {
  const paid = Number(o.paid_amount || 0);
  const total = Number(o.total_amount || 0);
  if (total > 0 && paid >= total) return { text: '已付清', color: 'green' };
  if (paid > 0) return { text: '部分收款', color: 'orange' };
  return { text: '未付', color: 'red' };
}

export function PayStatusTag({ order }: { order: any }) {
  const s = payStatus(order);
  return <Tag color={s.color}>{s.text}</Tag>;
}

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]));

// ============ 出 Invoice（账单）PDF：打印另存为 PDF ============
export async function exportInvoice(orderId: number) {
  const res = await api.get(`/api/orders/${orderId}`);
  const o = res.data;
  if (!o) { message.error('订单不存在'); return; }
  const sym = curSym(o);
  const d = new Date();
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const rows = (o.items || []).map((it: any, idx: number) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${esc(it.product_name)}</td>
      <td class="c">${it.qty}</td>
      <td class="r">${Number(it.price).toLocaleString()}</td>
      <td class="r">${Number(it.subtotal).toLocaleString()}</td>
    </tr>`).join('');
  const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>INVOICE ${esc(o.order_no)}</title>
<style>
  *{box-sizing:border-box;} body{font-family:"Microsoft YaHei","PingFang SC","Helvetica Neue",Arial,sans-serif;color:#1a1a1a;margin:0;padding:32px 40px;}
  .head{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:3px solid #1a1a1a;}
  .brand{display:flex;align-items:center;gap:10px;} .logo{height:46px;width:auto;}
  .brand .cn{font-size:24px;font-weight:800;letter-spacing:2px;} .brand .en{font-size:12px;color:#888;letter-spacing:3px;}
  .title{text-align:right;} .title .cn{font-size:24px;font-weight:800;} .title .en{font-size:12px;color:#888;letter-spacing:3px;}
  .info{display:flex;justify-content:space-between;margin:14px 0;font-size:13px;color:#333;} .info .r{text-align:right;line-height:1.7;}
  table{width:100%;border-collapse:collapse;font-size:13px;} th,td{border:1px solid #d9d9d9;padding:8px 10px;vertical-align:top;}
  thead th{background:#eef0f4;font-weight:700;text-align:center;} td.c{text-align:center;} td.r{text-align:right;}
  tfoot td{font-weight:700;background:#fafafa;}
  .notes{margin-top:18px;font-size:12px;color:#444;line-height:1.9;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{padding:12px 16px;} @page{margin:12mm;}}
</style></head><body>
  <div class="head">
    <div class="brand"><img class="logo" src="https://os.bantuqifu.com/bantu_logo.png" alt=""><div><div class="cn">斑兔分销</div><div class="en">BANTUQIFU</div></div></div>
    <div class="title"><div class="cn">账单 / INVOICE</div><div class="en">${esc(o.order_no)}</div></div>
  </div>
  <div class="info">
    <div>客户: ${esc(o.user_name || o.username)}${o.group_no ? `（[斑兔分销 ${esc(o.group_no)}]）` : ''}</div>
    <div class="r">日期: ${date}<br>货币: ${o.currency === 'RMB' ? 'CNY' : 'IDR'}</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:42px">序号</th><th>商品名称</th><th style="width:70px">数量</th>
      <th style="width:130px">单价(${sym})</th><th style="width:140px">小计(${sym})</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="4" class="r">应付总额</td><td class="r">${sym}${Number(o.total_amount).toLocaleString()}</td></tr>
      <tr><td colspan="4" class="r">已收</td><td class="r">${sym}${Number(o.paid_amount || 0).toLocaleString()}</td></tr>
      <tr><td colspan="4" class="r">尾款</td><td class="r">${sym}${Number(o.outstanding ?? (o.total_amount - (o.paid_amount || 0))).toLocaleString()}</td></tr>
    </tfoot>
  </table>
  <div class="notes">
    * 请按上述应付金额付款，付款后请提供转账凭证。<br>
    * 本账单由斑兔分销出具，最终以签约合同为准。<br>
    价格不含税，税费需客户方承担。中国发票税率 1%（技术服务/咨询费）；印尼发票 PPh23 税率 2%（咨询费）。
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) { message.error('请允许浏览器弹出窗口后重试'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

// ============ 催收：生成话术 + 复制 + 记录催收时间 ============
export async function dunOrder(order: any, onDone?: () => void) {
  const total = Number(order.total_amount || 0);
  const paid = Number(order.paid_amount || 0);
  const out = Number(order.outstanding ?? total - paid);
  const head = order.group_no ? `[斑兔分销 ${order.group_no}] ${order.user_name || ''}` : (order.user_name || '');
  const text =
    `${head} 您好，订单 ${order.order_no}：\n` +
    `应付 ${money(order, total)}，已收 ${money(order, paid)}，尾款 ${money(order, out)}。\n` +
    `请尽快安排付款，付款后回传转账凭证，谢谢！`;
  try { await navigator.clipboard.writeText(text); message.success('催收话术已复制，可粘贴到群里'); }
  catch { Modal.info({ title: '催收话术（请手动复制）', content: <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre> }); }
  await api.post(`/api/orders/${order.id}/dun`);
  onDone?.();
}

// ============ 收款弹窗：凭证列表 + 上传 + 财务确认/驳回 ============
export function PaymentModal({ order, onDone }: { order: any; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [proof, setProof] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await api.get(`/api/orders/${order.id}`);
    setDetail(res.data || null);
    setLoading(false);
  };
  const openModal = () => { setOpen(true); setAmount(null); setProof(''); load(); };

  const submit = async () => {
    if (!amount || amount <= 0) { message.warning('请填写到账金额'); return; }
    const res = await api.post('/api/payments', { order_id: order.id, amount, proof_image: proof });
    if (res.success) { message.success('凭证已提交，待财务确认'); setAmount(null); setProof(''); load(); onDone?.(); }
    else message.error(res.errorMessage || '失败');
  };
  const confirm = async (id: number) => {
    const res = await api.post(`/api/payments/${id}/confirm`);
    if (res.success) { message.success('已确认到账'); load(); onDone?.(); }
    else message.error(res.errorMessage || '失败');
  };
  const reject = async (id: number) => {
    const res = await api.post(`/api/payments/${id}/reject`);
    if (res.success) { message.success('已驳回'); load(); onDone?.(); }
    else message.error(res.errorMessage || '失败');
  };

  const o = detail || order;
  const total = Number(o.total_amount || 0);
  const paid = Number(o.paid_amount || 0);
  const out = total - paid;

  return (
    <>
      <a onClick={openModal}>收款</a>
      <Modal
        title={`收款 · ${order.order_no}`}
        open={open}
        width={720}
        onCancel={() => setOpen(false)}
        footer={<Button onClick={() => setOpen(false)}>关闭</Button>}
      >
        <div style={{ marginBottom: 12 }}>
          客户：{o.user_name}{o.group_no ? `（[斑兔分销 ${o.group_no}]）` : ''}　|
          应付 <b>{money(o, total)}</b>　已收 <b style={{ color: '#52c41a' }}>{money(o, paid)}</b>
          尾款 <b style={{ color: out > 0 ? '#cf1322' : '#52c41a' }}>{money(o, out)}</b>　<PayStatusTag order={o} />
        </div>

        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <b>登记收款</b>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <InputNumber
              placeholder="到账金额"
              min={0}
              style={{ width: 180 }}
              value={amount ?? undefined}
              onChange={(v) => setAmount(v)}
              formatter={(v: any) => (v != null && v !== '' ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(v: any) => (v ? Number(String(v).replace(/,/g, '')) : 0) as any}
            />
            <Upload
              maxCount={1}
              accept="image/*"
              action="/api/upload"
              headers={{ Authorization: `Bearer ${getToken()}` }}
              onChange={(info) => {
                if (info.file.status === 'done') setProof(info.file.response?.data?.url || '');
                if (info.file.status === 'removed') setProof('');
              }}
            >
              <Button icon={<UploadOutlined />}>上传凭证</Button>
            </Upload>
            <Button type="primary" onClick={submit}>提交</Button>
          </div>
        </div>

        <Table
          title={() => '收款记录'}
          dataSource={o.payments || []}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          columns={[
            { title: '时间', dataIndex: 'created_at', width: 150 },
            { title: '金额', dataIndex: 'amount', width: 120, align: 'right', render: (v) => money(o, v) },
            {
              title: '凭证', dataIndex: 'proof_image', width: 70,
              render: (v) => (v ? <Image src={v} width={40} height={40} style={{ objectFit: 'cover' }} /> : '-'),
            },
            {
              title: '状态', dataIndex: 'status', width: 90,
              render: (v) => v === 'confirmed' ? <Tag color="green">已确认</Tag>
                : v === 'rejected' ? <Tag>已驳回</Tag> : <Tag color="orange">待确认</Tag>,
            },
            {
              title: '操作', width: 130,
              render: (_, r: any) => r.status === 'pending' ? (
                <>
                  <Popconfirm title="确认该笔已到账？" onConfirm={() => confirm(r.id)}>
                    <a>确认</a>
                  </Popconfirm>
                  <Popconfirm title="驳回该凭证？" onConfirm={() => reject(r.id)}>
                    <a style={{ color: 'red', marginLeft: 10 }}>驳回</a>
                  </Popconfirm>
                </>
              ) : '-',
            },
          ]}
        />
      </Modal>
    </>
  );
}
