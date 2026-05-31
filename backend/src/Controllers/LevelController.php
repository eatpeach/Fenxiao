<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class LevelController
{
    public function index(): void
    {
        Http::requireAuth();
        $rows = Database::get()->query(
            'SELECT * FROM distributor_levels ORDER BY sort, id'
        )->fetchAll();
        Http::ok($rows);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        if (empty($b['name'])) Http::fail('等级名称不能为空');
        $stmt = Database::get()->prepare(
            'INSERT INTO distributor_levels (name, commission_rate, discount_rate, sort) VALUES (?,?,?,?)'
        );
        $stmt->execute([
            $b['name'],
            (float)($b['commission_rate'] ?? 0),
            (float)($b['discount_rate'] ?? 0),
            (int)($b['sort'] ?? 0),
        ]);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $stmt = Database::get()->prepare(
            'UPDATE distributor_levels SET name=?, commission_rate=?, discount_rate=?, sort=? WHERE id=?'
        );
        $stmt->execute([
            $b['name'] ?? '',
            (float)($b['commission_rate'] ?? 0),
            (float)($b['discount_rate'] ?? 0),
            (int)($b['sort'] ?? 0),
            (int)$p['id'],
        ]);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $p): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare('DELETE FROM distributor_levels WHERE id=?');
        $stmt->execute([(int)$p['id']]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }
}
