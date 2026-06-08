<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class StatsController
{
    /** 仪表盘汇总（金额按主力币种 Rp 统计） */
    public function dashboard(): void
    {
        Http::requireAuth();
        $db = Database::get();
        $val = fn(string $sql) => $db->query($sql)->fetchColumn();

        Http::ok([
            'products' => [
                'total'  => (int)$val("SELECT COUNT(*) FROM products"),
                'active' => (int)$val("SELECT COUNT(*) FROM products WHERE status=1"),
            ],
            'distributors' => [
                'total'  => (int)$val("SELECT COUNT(*) FROM users WHERE role='distributor'"),
                'active' => (int)$val("SELECT COUNT(*) FROM users WHERE role='distributor' AND status=1"),
            ],
            'orders' => [
                'total' => (int)$val("SELECT COUNT(*) FROM orders"),
                'month' => (int)$val("SELECT COUNT(*) FROM orders WHERE created_at >= date('now','start of month')"),
            ],
            'sales' => [
                'total'       => (float)$val("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE currency='RP'"),
                'month'       => (float)$val("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE currency='RP' AND created_at >= date('now','start of month')"),
                'paid'        => (float)$val("SELECT COALESCE(SUM(paid_amount),0) FROM orders WHERE currency='RP'"),
                'outstanding' => (float)$val("SELECT COALESCE(SUM(total_amount-paid_amount),0) FROM orders WHERE currency='RP'"),
            ],
            'todo' => [
                'payments'    => (int)$val("SELECT COUNT(*) FROM payments WHERE status='pending'"),
                'withdrawals' => (int)$val("SELECT COUNT(*) FROM withdrawals WHERE status='pending'"),
                'commissions' => (float)$val("SELECT COALESCE(SUM(amount),0) FROM commissions WHERE status='pending'"),
                'overdue'     => (int)$val("SELECT COUNT(*) FROM orders WHERE total_amount-paid_amount>0 AND julianday('now')-julianday(created_at)>30"),
            ],
            'topDistributors' => $db->query(
                "SELECT u.name, u.group_no, COALESCE(SUM(o.total_amount),0) AS amount, COUNT(o.id) AS orders
                 FROM orders o JOIN users u ON u.id=o.user_id WHERE o.currency='RP'
                 GROUP BY o.user_id ORDER BY amount DESC LIMIT 5"
            )->fetchAll(),
            'recentOrders' => $db->query(
                "SELECT o.order_no, o.total_amount, o.paid_amount, o.currency, o.created_at, u.name AS user_name
                 FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 8"
            )->fetchAll(),
            'salesTrend' => $db->query(
                "SELECT date(created_at) AS d, COALESCE(SUM(total_amount),0) AS amount
                 FROM orders WHERE currency='RP' AND created_at >= date('now','-13 days')
                 GROUP BY date(created_at) ORDER BY d"
            )->fetchAll(),
        ]);
    }
}
