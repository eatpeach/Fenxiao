<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class OrderController
{
    public function index(): void
    {
        Http::requireAuth();
        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $size;

        $where = [];
        $args  = [];
        $pay = $_GET['pay'] ?? '';
        if ($pay === 'unpaid')        $where[] = 'o.paid_amount <= 0';
        elseif ($pay === 'partial')   $where[] = 'o.paid_amount > 0 AND o.paid_amount < o.total_amount';
        elseif ($pay === 'paid')      $where[] = 'o.total_amount > 0 AND o.paid_amount >= o.total_amount';
        if (!empty($_GET['outstanding'])) $where[] = 'o.total_amount - o.paid_amount > 0';

        $sql = 'FROM orders o LEFT JOIN users u ON u.id = o.user_id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);

        $total = Database::get()->prepare("SELECT COUNT(*) $sql");
        $total->execute($args);
        $totalCount = (int)$total->fetchColumn();

        $stmt = Database::get()->prepare(
            "SELECT o.*, u.name AS user_name, u.group_no,
                    (o.total_amount - o.paid_amount) AS outstanding,
                    CAST(julianday('now') - julianday(o.created_at) AS INTEGER) AS age_days,
                    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
             $sql ORDER BY o.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute($args);
        Http::ok($stmt->fetchAll(), ['total' => $totalCount]);
    }

    public function show(array $p): void
    {
        Http::requireAuth();
        $db = Database::get();
        $id = (int)$p['id'];
        $o = $db->prepare(
            'SELECT o.*, u.name AS user_name, u.group_no, u.username,
                    (o.total_amount - o.paid_amount) AS outstanding
             FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?'
        );
        $o->execute([$id]);
        $order = $o->fetch();
        if (!$order) Http::fail('订单不存在', 404);

        $items = $db->prepare('SELECT * FROM order_items WHERE order_id = ?');
        $items->execute([$id]);
        $order['items'] = $items->fetchAll();

        $pm = $db->prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC');
        $pm->execute([$id]);
        $order['payments'] = $pm->fetchAll();

        Http::ok($order);
    }

    /** 记录催收时间 */
    public function dun(array $p): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare("UPDATE orders SET dunned_at = datetime('now') WHERE id = ?");
        $stmt->execute([(int)$p['id']]);
        Http::ok(['dunned' => 1]);
    }

    /**
     * 下单：body = { user_id, currency, remark, items:[{product_id, qty}] }
     * 单价取商品 box_price_rp(RP) 或 price_rmb(RMB)。下单后按两级返佣。
     */
    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $userId = (int)($b['user_id'] ?? 0);
        $currency = ($b['currency'] ?? 'RP') === 'RMB' ? 'RMB' : 'RP';
        $items = $b['items'] ?? [];
        if (!$userId || !$items) Http::fail('请选择分销商和商品');

        $db = Database::get();
        $db->beginTransaction();
        try {
            $orderNo = 'SO' . date('YmdHis') . random_int(100, 999);
            $db->prepare('INSERT INTO orders (order_no, user_id, currency, remark) VALUES (?,?,?,?)')
               ->execute([$orderNo, $userId, $currency, $b['remark'] ?? '']);
            $orderId = (int)$db->lastInsertId();

            $priceCol = $currency === 'RMB' ? 'price_rmb' : 'box_price_rp';
            $buyerLevel = $this->levelOf($userId);
            $total = 0;
            $lineItems = [];
            $getProduct = $db->prepare("SELECT name, category_id, $priceCol AS price FROM products WHERE id = ?");
            $insItem = $db->prepare(
                'INSERT INTO order_items (order_id, product_id, product_name, price, qty, subtotal)
                 VALUES (?,?,?,?,?,?)'
            );
            foreach ($items as $it) {
                $pid = (int)($it['product_id'] ?? 0);
                $qty = max(1, (int)($it['qty'] ?? 1));
                $getProduct->execute([$pid]);
                $prod = $getProduct->fetch();
                if (!$prod) continue;
                $catId  = (int)$prod['category_id'];
                $retail = (float)$prod['price'];
                // 拿货价 = 零售价 × 买家该分类拿货折扣（优先分类费率，缺省等级默认）
                [, $disc] = $this->rateFor($buyerLevel, $catId);
                $price = ($disc > 0) ? round($retail * $disc) : $retail;
                $subtotal = $price * $qty;
                $total += $subtotal;
                $insItem->execute([$orderId, $pid, $prod['name'], $price, $qty, $subtotal]);
                $lineItems[] = ['category_id' => $catId, 'subtotal' => $subtotal];
            }

            $db->prepare('UPDATE orders SET total_amount = ? WHERE id = ?')->execute([$total, $orderId]);
            $this->generateCommissions($orderId, $userId, $lineItems, $total);

            $db->commit();
            Http::ok(['id' => $orderId, 'order_no' => $orderNo, 'total' => $total]);
        } catch (\Throwable $e) {
            $db->rollBack();
            Http::fail('下单失败: ' . $e->getMessage(), 500);
        }
    }

    /** 沿推广上级链最多两级，按「分类费率优先、等级默认兜底」逐明细计佣 */
    private function generateCommissions(int $orderId, int $buyerId, array $lineItems, float $total): void
    {
        $db = Database::get();
        $getUser = $db->prepare('SELECT parent_id, level_id FROM users WHERE id = ?');
        $insComm = $db->prepare(
            'INSERT INTO commissions (order_id, user_id, amount, rate, level) VALUES (?,?,?,?,?)'
        );

        $getUser->execute([$buyerId]);
        $row = $getUser->fetch();
        for ($level = 1; $level <= 2; $level++) {
            if (!$row || empty($row['parent_id'])) break;
            $parentId = (int)$row['parent_id'];
            $getUser->execute([$parentId]);
            $parent = $getUser->fetch();
            $plevel = (int)($parent['level_id'] ?? 0);
            $amount = 0;
            foreach ($lineItems as $li) {
                [$comm] = $this->rateFor($plevel, (int)$li['category_id']);
                $amount += $li['subtotal'] * $comm;
            }
            if ($amount > 0) {
                $rate = $total > 0 ? $amount / $total : 0;   // 混合后的有效费率（仅记录用）
                $insComm->execute([$orderId, $parentId, $amount, $rate, $level]);
            }
            $row = $parent;
        }
    }

    /** 用户的等级 id（无则 0） */
    private function levelOf(int $userId): int
    {
        $s = Database::get()->prepare('SELECT level_id FROM users WHERE id = ?');
        $s->execute([$userId]);
        return (int)$s->fetchColumn();
    }

    /** 返回 [commission_rate, discount_rate]：优先 level×category，缺省取等级默认值 */
    private function rateFor(int $levelId, int $categoryId): array
    {
        if ($levelId <= 0) return [0.0, 0.0];
        $db = Database::get();
        $s = $db->prepare(
            'SELECT commission_rate, discount_rate FROM level_category_rates WHERE level_id = ? AND category_id = ?'
        );
        $s->execute([$levelId, $categoryId]);
        $r = $s->fetch();
        if ($r) return [(float)$r['commission_rate'], (float)$r['discount_rate']];
        $d = $db->prepare('SELECT commission_rate, discount_rate FROM distributor_levels WHERE id = ?');
        $d->execute([$levelId]);
        $dr = $d->fetch();
        return [(float)($dr['commission_rate'] ?? 0), (float)($dr['discount_rate'] ?? 0)];
    }
}
