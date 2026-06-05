<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class PaymentController
{
    /** 收款记录列表，可按 status / order_id 过滤 */
    public function index(): void
    {
        Http::requireAuth();
        $where = [];
        $args = [];
        if (!empty($_GET['status'])) {
            $where[] = 'pm.status = ?';
            $args[] = $_GET['status'];
        }
        if (!empty($_GET['order_id'])) {
            $where[] = 'pm.order_id = ?';
            $args[] = (int)$_GET['order_id'];
        }
        $sql = 'FROM payments pm
                LEFT JOIN orders o ON o.id = pm.order_id
                LEFT JOIN users  u ON u.id = o.user_id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);

        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $size;

        $total = Database::get()->prepare("SELECT COUNT(*) $sql");
        $total->execute($args);
        $totalCount = (int)$total->fetchColumn();

        $stmt = Database::get()->prepare(
            "SELECT pm.*, o.order_no, o.total_amount, o.paid_amount,
                    u.name AS user_name, u.group_no
             $sql ORDER BY pm.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute($args);
        Http::ok($stmt->fetchAll(), ['total' => $totalCount]);
    }

    /** 上传收款凭证：body = { order_id, amount, proof_image, note } */
    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $orderId = (int)($b['order_id'] ?? 0);
        $amount  = (float)($b['amount'] ?? 0);
        if (!$orderId || $amount <= 0) Http::fail('请填写订单与到账金额');

        $stmt = Database::get()->prepare(
            'INSERT INTO payments (order_id, amount, proof_image, note) VALUES (?,?,?,?)'
        );
        $stmt->execute([$orderId, $amount, $b['proof_image'] ?? '', $b['note'] ?? '']);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    /** 财务确认到账：累加到订单 paid_amount */
    public function confirm(array $p): void
    {
        Http::requireAdmin();
        $db = Database::get();
        $db->beginTransaction();
        try {
            $s = $db->prepare("SELECT * FROM payments WHERE id = ? AND status = 'pending'");
            $s->execute([(int)$p['id']]);
            $pay = $s->fetch();
            if (!$pay) { $db->rollBack(); Http::fail('收款记录不存在或已处理'); }

            $db->prepare("UPDATE payments SET status='confirmed', confirmed_at=datetime('now') WHERE id=?")
               ->execute([(int)$p['id']]);
            $db->prepare('UPDATE orders SET paid_amount = paid_amount + ? WHERE id = ?')
               ->execute([(float)$pay['amount'], (int)$pay['order_id']]);
            $db->commit();
            Http::ok(['confirmed' => 1]);
        } catch (\Throwable $e) {
            $db->rollBack();
            Http::fail('确认失败: ' . $e->getMessage(), 500);
        }
    }

    /** 驳回凭证 */
    public function reject(array $p): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare("UPDATE payments SET status='rejected' WHERE id=? AND status='pending'");
        $stmt->execute([(int)$p['id']]);
        Http::ok(['rejected' => $stmt->rowCount()]);
    }
}
