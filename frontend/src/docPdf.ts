const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]));
const fmt = (n: any) => Number(n || 0).toLocaleString();

export interface DocItem { name: string; spec?: string; qty: number; unit: number; image?: string; }

// 生成报价单/账单 PDF（茗寳集品牌，先预览后打印）
export function exportDoc(o: { mode: 'quote' | 'invoice'; customer: string; meta?: string; items: DocItem[] }) {
  const isInv = o.mode === 'invoice';
  const d = new Date();
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const origin = window.location.origin;
  const logo = origin + '/img/logo.png';
  const abs = (u?: string) => (!u ? '' : u.startsWith('http') ? u : origin + u);
  const total = o.items.reduce((s, i) => s + i.unit * i.qty, 0);
  const rows = o.items.map((i, idx) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td class="c">${i.image ? `<img class="pic" src="${esc(abs(i.image))}">` : ''}</td>
      <td>${esc(i.name)}</td>
      <td class="c">${esc(i.spec || '')}</td>
      <td class="c">${i.qty}</td>
      <td class="r">${fmt(i.unit)}</td>
      <td class="r">${fmt(i.unit * i.qty)}</td>
    </tr>`).join('');
  const titleCn = isInv ? '账单' : '报价单';
  const titleEn = isInv ? 'INVOICE' : 'QUOTATION';
  const footer = isInv
    ? '* 请按上述金额付款，付款后请提供转账凭证。<br>* 本账单由茗寳集出具，最终以签约/合同为准。<br>价格不含税，税费需客户方承担。'
    : '* 以上报价有效期 30 天，最终以签约/订单为准。<br>* 本报价单由茗寳集出具。<br>价格不含税，税费需客户方承担。';
  const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>${titleCn} ${esc(o.customer)}</title>
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
  .pic{width:48px;height:48px;object-fit:cover;border-radius:4px;}
  .notes{margin-top:18px;font-size:12px;color:#444;line-height:1.9;border-top:1px solid #eee;padding-top:12px;}
  .bar{position:sticky;top:0;z-index:9;background:#fff;padding:8px 0 12px;text-align:right;border-bottom:1px dashed #ddd;margin-bottom:14px;}
  .bar button{font-size:14px;padding:8px 18px;background:#a8322a;color:#fff;border:none;border-radius:6px;cursor:pointer;}
  @media print{body{padding:12px 16px;} @page{margin:12mm;} .no-print{display:none!important;}}
</style></head><body>
  <div class="bar no-print"><button onclick="window.print()">打印 / 保存为 PDF</button></div>
  <div class="head">
    <div class="brand"><img class="logo" src="${logo}" alt=""><div><div class="cn">茗寳集</div><div class="en">MING BAO JI</div></div></div>
    <div class="title"><div class="cn">${titleCn}</div><div class="en">${titleEn}</div></div>
  </div>
  <div class="info">
    <div>客户: ${esc(o.customer)}${o.meta ? `（${esc(o.meta)}）` : ''}</div>
    <div class="r">日期: ${date}<br>货币: IDR（印尼盾）</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:42px">序号</th><th style="width:62px">图片</th><th>商品名称</th><th style="width:80px">规格</th>
      <th style="width:54px">数量</th><th style="width:120px">单价(印尼盾)</th><th style="width:130px">小计</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="6" class="r">${isInv ? '应付总额' : '合计'}</td><td class="r">${fmt(total)}</td></tr></tfoot>
  </table>
  <div class="notes">${footer}</div>
</body></html>`;
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}
