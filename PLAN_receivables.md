# 应收账款（订单收款 / 对账 / 催收）实现计划

全部后台操作；分销商在群里发凭证，员工后台录入，财务后台确认。

## 数据模型
- orders 增列：paid_amount(已确认收款)、dunned_at(最近催收时间)
- 尾款 = total_amount - paid_amount；付款状态由此推导(未付/部分/已付清)
- 新表 payments(id, order_id, amount, proof_image, status[pending/confirmed/rejected], note, created_at, confirmed_at)

## 流程 → 落地
1. 发 Invoice：订单详情「出 Invoice」→ 品牌 PDF(INVOICE 抬头 + 订单号/客户/明细/应付)
2. 上传收款凭证：订单「收款」弹窗填到账金额+传截图 → payments(pending)，支持多次
3. 财务确认：收款审核页(待确认凭证带图)→ 确认到账(累加 paid_amount) / 驳回
4. 催收尾款：应收催收页(尾款>0)→ 客户群名/应付/已收/尾款/账龄/最近催收 → 一键生成催款话术 + 记录 dunned_at

## 步骤与验证点
1. schema+migrate：建 payments、补 orders 列（幂等）— 迁移可重复跑
2. PaymentController(index/store/confirm/reject)+路由 — 确认后 paid_amount 累加
3. OrderController 丰富(index 带已收/尾款/客户、show 带 payments、dun)
4. 前端 Orders：收款状态列 + 收款弹窗(传凭证/确认/驳回) + Invoice PDF + 催收
5. 前端 收款审核页 + 应收催收页 + 菜单/路由
6. tsc/build/commit
