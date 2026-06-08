<?php
namespace App\Controllers;

use App\Database;
use App\Http;

// 后台账号（role = admin）管理
class AccountController
{
    public function index(): void
    {
        Http::requireAdmin();
        $rows = Database::get()->query(
            "SELECT id, username, name, status, created_at FROM users WHERE role = 'admin' ORDER BY id"
        )->fetchAll();
        Http::ok($rows);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $username = trim($b['username'] ?? '');
        $password = $b['password'] ?? '';
        if ($username === '' || $password === '') Http::fail('用户名和密码不能为空');

        $exists = Database::get()->prepare('SELECT COUNT(*) FROM users WHERE username = ?');
        $exists->execute([$username]);
        if ($exists->fetchColumn()) Http::fail('用户名已存在');

        $stmt = Database::get()->prepare(
            "INSERT INTO users (username, password, name, role, status) VALUES (?,?,?,'admin',1)"
        );
        $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $b['name'] ?? '']);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $sets = ['name = ?', 'status = ?'];
        $args = [$b['name'] ?? '', (int)($b['status'] ?? 1)];
        if (!empty($b['password'])) {
            $sets[] = 'password = ?';
            $args[] = password_hash($b['password'], PASSWORD_DEFAULT);
        }
        $args[] = (int)$p['id'];
        $stmt = Database::get()->prepare(
            "UPDATE users SET " . implode(',', $sets) . " WHERE id = ? AND role = 'admin'"
        );
        $stmt->execute($args);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $p): void
    {
        Http::requireAdmin();
        $id = (int)$p['id'];
        // 不允许删除初始管理员 admin，且至少保留一个后台账号
        $u = Database::get()->prepare("SELECT username FROM users WHERE id = ? AND role = 'admin'");
        $u->execute([$id]);
        $row = $u->fetch();
        if (!$row) Http::fail('账号不存在');
        if ($row['username'] === 'admin') Http::fail('初始管理员 admin 不可删除');
        $cnt = (int)Database::get()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($cnt <= 1) Http::fail('至少保留一个后台账号');

        $stmt = Database::get()->prepare("DELETE FROM users WHERE id = ? AND role = 'admin'");
        $stmt->execute([$id]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }
}
