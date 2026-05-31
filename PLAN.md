# 分销系统 实施计划（PLAN）

> 目标驱动：每个里程碑都给出**可验证目标**。后端本机无 PHP，标注的"验证"分为
> 「本机可验证（静态/前端）」与「需服务器/PHP 环境验证」两类。

## 技术栈（已确认）
- 后端：**原生 PHP 8.0**，零 Composer 依赖，PDO + **SQLite**，迷你路由，token 用 HMAC 签名。
- 前端：**Vite + React + TS + antd + @ant-design/pro-components**（ProLayout/ProTable/ProForm），标准 Ant Design Pro 登录页。
- 部署：用户自行部署到服务器（服务器需 PHP 8.0）。

## 业务背景
- 印尼向的分销业务，双币种 **Rp（印尼盾）+ ¥（人民币）**。
- 品类：烟、酒、茶、茶桌、茶具、屏风、特产。当前定价表只含**茶**类（18 条）。
- 定价表多档价格：单泡价/RP、单价/RMB、一盒单价/RP、批量拿货价、成本价。
  - ⚠️ 待确认：`批量拿货价` 部分行小于 `成本价`，列语义需用户确认（先原样入库）。

## 数据模型（核心表）
- `users` 用户/分销商：含 `level_id`（分级）、`parent_id`（推广上级）、`balance`。
- `distributor_levels` 分销商等级：名称、折扣率/佣金率。
- `categories` 商品分类（烟酒茶茶桌茶具屏风特产）。
- `products` 商品：编码、条码、品名、规格、产地、单位、一盒数量、多档价格、备注、图片。
- `orders` 订单 + `order_items` 订单明细。
- `commissions` 佣金记录（按订单+分销层级生成）。
- `withdrawals` 提现申请。

## 里程碑

### M0 项目骨架 + 计划
- [x] CLAUDE.md（准则）、PLAN.md（本文件）、目录结构。
- 验证：文件存在，结构清晰。✅本机可验证。

### M1 后端基础 + 数据库 + 导入定价数据
- [x] SQLite schema 建表脚本；PDO 连接；迷你路由；入口 `public/index.php`。
- [x] 导入脚本：解析茶类 CSV 入 `products`，建好分类。
- 验证（需 PHP）：`php backend/migrate.php` 建库成功；`php backend/seed.php` 导入 18 条茶；`GET /api/products` 返回数据。

### M2 认证 + 商品/分类 API
- [x] 登录(token)、当前用户、商品/分类 CRUD。
- 验证（需 PHP）：登录拿到 token；带 token 访问受保护接口；商品增删改查可用。

### M3 前端：登录页 + 后台框架 + 商品页
- [x] 标准 Ant Design Pro 登录页；ProLayout 侧边栏；商品 ProTable 接通 API。
- 验证：✅本机可 `npm run dev` 起前端；登录后看到商品列表（需后端在线）。

### M4 分销商分级 + 推广关系
- [x] 分销商等级管理；用户分级；推广上级绑定。
- 验证（需 PHP）：创建等级、给用户设级、绑定上级。

### M5 订单 + 佣金结算
- [x] 下单/订单管理；按分销层级生成佣金。
- 验证（需 PHP）：下单后生成对应佣金记录，金额符合等级规则。

### M6 提现
- [x] 提现申请/审核；余额扣减。
- 验证（需 PHP）：申请提现后余额与状态正确变更。

## 运行 / 部署
### 后端（需服务器 PHP 8.0）
```bash
php backend/migrate.php      # 建库
php backend/seed.php         # 初始化数据 + 导入茶类（admin/admin123）
php -S localhost:8001 -t backend/public   # 本地起服务
```
生产用 Apache/Nginx 指向 `backend/public`，已带 .htaccess 重写。

### 前端
```bash
cd frontend && npm install && npm run dev   # http://localhost:8000
```
开发态 `/api` 代理到 `localhost:8001`（见 vite.config.ts）。

默认账号：**admin / admin123**

## 已自行拍板的默认（要改告诉我）
1. **下单单价**：RP 单走 `box_price_rp`（一盒单价），RMB 单走 `price_rmb`。
2. **佣金规则**：沿推广上级链**两级返佣**，每级按该上级自身等级的 `commission_rate`，基数=订单总额。默认等级：普通5% / 银牌8% / 金牌12%。
3. **佣金入账**：管理员点"结算"时 pending→settled 并计入受益人 `balance`。
4. **提现**：申请校验 ≤ 余额；审核"通过"时扣余额并置 paid，"拒绝"置 rejected。
5. 前端用 Vite+pro-components（非官方 umi 脚手架）。

## 仍需你提供（非阻塞）
- 定价列语义：`批量拿货价` 部分行 < `成本价`，两列含义待澄清（现原样入库与展示）。
- 其他品类（烟/酒/茶桌/茶具/屏风/特产）的商品数据来源（分类已建好，等数据）。
