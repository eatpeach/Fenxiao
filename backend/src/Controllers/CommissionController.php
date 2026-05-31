<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class CommissionController
{
    public function index(): void
    {
        Http::requireAuth();
        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $size;

        $total = (int)Database::get()->query('SELECT COUNT(*) FROM commissions')->fetchColumn();
        $stmt = Database::get()->prepare(
            "SELECT c.*, u.name AS user_name, o.order_no
             FROM commissions c
             LEFT JOIN users u ON u.id = c.user_id
             LEFT JOIN orders o ON o.id = c.order_id
             ORDER BY c.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute();
        Http::ok($stmt->fetchAll(), ['total' => $total]);
    }

    /** 结算：pending -> settled，并把佣金计入受益人余额 */
    public function settle(array $p): void
    {
        Http::requireAdmin();
        $db = Database::get();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT * FROM commissions WHERE id = ? AND status = 'pending'");
            $stmt->execute([(int)$p['id']]);
            $c = $stmt->fetch();
            if (!$c) { $db->rollBack(); Http::fail('佣金不存在或已结算'); }

            $db->prepare("UPDATE commissions SET status = 'settled' WHERE id = ?")->execute([(int)$p['id']]);
            $db->prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
               ->execute([(float)$c['amount'], (int)$c['user_id']]);
            $db->commit();
            Http::ok(['settled' => 1]);
        } catch (\Throwable $e) {
            $db->rollBack();
            Http::fail('结算失败: ' . $e->getMessage(), 500);
        }
    }
}
