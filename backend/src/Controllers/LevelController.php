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

    // 某等级下，各分类的佣金率/拿货折扣（未设置的返回 null，由前端用等级默认值兜底）
    public function rates(array $p): void
    {
        Http::requireAuth();
        $stmt = Database::get()->prepare(
            'SELECT c.id AS category_id, c.name AS category_name,
                    r.commission_rate, r.discount_rate
             FROM categories c
             LEFT JOIN level_category_rates r ON r.category_id = c.id AND r.level_id = ?
             ORDER BY c.sort, c.id'
        );
        $stmt->execute([(int)$p['id']]);
        Http::ok($stmt->fetchAll());
    }

    public function saveRates(array $p): void
    {
        Http::requireAdmin();
        $lid  = (int)$p['id'];
        $rows = Http::body()['rates'] ?? [];
        $db   = Database::get();
        $db->beginTransaction();
        $db->prepare('DELETE FROM level_category_rates WHERE level_id = ?')->execute([$lid]);
        $ins = $db->prepare(
            'INSERT INTO level_category_rates (level_id, category_id, commission_rate, discount_rate)
             VALUES (?,?,?,?)'
        );
        foreach ($rows as $r) {
            if (empty($r['category_id'])) continue;
            $ins->execute([
                $lid,
                (int)$r['category_id'],
                (float)($r['commission_rate'] ?? 0),
                (float)($r['discount_rate'] ?? 0),
            ]);
        }
        $db->commit();
        Http::ok(['saved' => count($rows)]);
    }
}
