<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class DistributorController
{
    public function index(): void
    {
        Http::requireAuth();
        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $where = ["u.role = 'distributor'"];
        $args = [];
        if (!empty($_GET['name'])) {
            $where[] = '(u.name LIKE ? OR u.username LIKE ?)';
            $args[] = '%' . $_GET['name'] . '%';
            $args[] = '%' . $_GET['name'] . '%';
        }
        $sql = 'FROM users u
                LEFT JOIN distributor_levels l ON l.id = u.level_id
                LEFT JOIN users p ON p.id = u.parent_id
                WHERE ' . implode(' AND ', $where);

        $total = Database::get()->prepare("SELECT COUNT(*) $sql");
        $total->execute($args);
        $totalCount = (int)$total->fetchColumn();

        $offset = ($page - 1) * $size;
        $stmt = Database::get()->prepare(
            "SELECT u.id, u.username, u.name, u.phone, u.group_no, u.level_id, u.parent_id,
                    u.balance, u.status, l.name AS level_name, p.name AS parent_name
             $sql ORDER BY u.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute($args);
        Http::ok($stmt->fetchAll(), ['total' => $totalCount]);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        if (empty($b['username']) || empty($b['password'])) {
            Http::fail('用户名和密码不能为空');
        }
        $exists = Database::get()->prepare('SELECT COUNT(*) FROM users WHERE username = ?');
        $exists->execute([$b['username']]);
        if ($exists->fetchColumn()) Http::fail('用户名已存在');

        $stmt = Database::get()->prepare(
            'INSERT INTO users (username, password, name, phone, group_no, role, level_id, parent_id)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $b['username'],
            password_hash($b['password'], PASSWORD_DEFAULT),
            $b['name'] ?? '',
            $b['phone'] ?? '',
            $this->nextGroupNo(),
            'distributor',
            !empty($b['level_id']) ? (int)$b['level_id'] : null,
            !empty($b['parent_id']) ? (int)$b['parent_id'] : null,
        ]);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    /** 下一个可用群编号：从 1001 起，跳过含数字 4 的，且跳过已占用的 */
    public function nextGroupNo(): string
    {
        $used = [];
        foreach (Database::get()->query("SELECT group_no FROM users WHERE group_no IS NOT NULL AND group_no <> ''") as $r) {
            $used[(string)$r['group_no']] = true;
        }
        $n = 1001;
        while (strpos((string)$n, '4') !== false || isset($used[(string)$n])) {
            $n++;
        }
        return (string)$n;
    }

    public function update(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $id = (int)$p['id'];
        // 群编号系统自动生成、不可改：编辑时不更新该列
        $sets = ['name = ?', 'phone = ?', 'level_id = ?', 'parent_id = ?', 'status = ?'];
        $args = [
            $b['name'] ?? '',
            $b['phone'] ?? '',
            !empty($b['level_id']) ? (int)$b['level_id'] : null,
            !empty($b['parent_id']) ? (int)$b['parent_id'] : null,
            (int)($b['status'] ?? 1),
        ];
        if (!empty($b['password'])) {
            $sets[] = 'password = ?';
            $args[] = password_hash($b['password'], PASSWORD_DEFAULT);
        }
        $args[] = $id;
        $stmt = Database::get()->prepare('UPDATE users SET ' . implode(',', $sets) . ' WHERE id = ?');
        $stmt->execute($args);
        Http::ok(['updated' => $stmt->rowCount()]);
    }
}
