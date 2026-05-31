<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class WithdrawalController
{
    public function index(): void
    {
        Http::requireAuth();
        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $offset = ($page - 1) * $size;

        $total = (int)Database::get()->query('SELECT COUNT(*) FROM withdrawals')->fetchColumn();
        $stmt = Database::get()->prepare(
            "SELECT w.*, u.name AS user_name, u.balance AS user_balance
             FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id
             ORDER BY w.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute();
        Http::ok($stmt->fetchAll(), ['total' => $total]);
    }

    /** 申请提现：body = { user_id, amount }，校验不超过余额 */
    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $userId = (int)($b['user_id'] ?? 0);
        $amount = (float)($b['amount'] ?? 0);
        if (!$userId || $amount <= 0) Http::fail('请选择分销商并填写金额');

        $stmt = Database::get()->prepare('SELECT balance FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $balance = $stmt->fetchColumn();
        if ($balance === false) Http::fail('分销商不存在');
        if ($amount > (float)$balance) Http::fail('提现金额超过可用余额');

        Database::get()->prepare(
            'INSERT INTO withdrawals (user_id, amount, remark) VALUES (?,?,?)'
        )->execute([$userId, $amount, $b['remark'] ?? '']);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    /** 审核：body = { action: approve|reject }。通过则扣余额 */
    public function review(array $p): void
    {
        Http::requireAdmin();
        $action = Http::body()['action'] ?? '';
        $db = Database::get();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'");
            $stmt->execute([(int)$p['id']]);
            $w = $stmt->fetch();
            if (!$w) { $db->rollBack(); Http::fail('提现记录不存在或已处理'); }

            if ($action === 'approve') {
                $bal = $db->prepare('SELECT balance FROM users WHERE id = ?');
                $bal->execute([(int)$w['user_id']]);
                if ((float)$bal->fetchColumn() < (float)$w['amount']) {
                    $db->rollBack();
                    Http::fail('余额不足，无法通过');
                }
                $db->prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
                   ->execute([(float)$w['amount'], (int)$w['user_id']]);
                $db->prepare("UPDATE withdrawals SET status = 'paid' WHERE id = ?")->execute([(int)$p['id']]);
            } elseif ($action === 'reject') {
                $db->prepare("UPDATE withdrawals SET status = 'rejected' WHERE id = ?")->execute([(int)$p['id']]);
            } else {
                $db->rollBack();
                Http::fail('未知操作');
            }
            $db->commit();
            Http::ok(['ok' => 1]);
        } catch (\Throwable $e) {
            $db->rollBack();
            Http::fail('审核失败: ' . $e->getMessage(), 500);
        }
    }
}
