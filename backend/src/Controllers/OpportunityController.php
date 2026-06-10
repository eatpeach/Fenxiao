<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class OpportunityController
{
    private array $fields = [
        'name', 'type', 'contact', 'level_id', 'source', 'stage',
        'intent', 'amount', 'owner', 'next_follow_at', 'remark',
    ];

    public function index(): void
    {
        Http::requireAuth();
        $page = max(1, (int)($_GET['current'] ?? 1));
        $size = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $where = [];
        $args = [];
        if (!empty($_GET['name']))  { $where[] = 'o.name LIKE ?'; $args[] = '%' . $_GET['name'] . '%'; }
        if (!empty($_GET['type']))  { $where[] = 'o.type = ?';  $args[] = $_GET['type']; }
        if (!empty($_GET['stage'])) { $where[] = 'o.stage = ?'; $args[] = $_GET['stage']; }

        $sql = 'FROM opportunities o LEFT JOIN distributor_levels l ON l.id = o.level_id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);

        $total = Database::get()->prepare("SELECT COUNT(*) $sql");
        $total->execute($args);
        $totalCount = (int)$total->fetchColumn();

        $offset = ($page - 1) * $size;
        $stmt = Database::get()->prepare(
            "SELECT o.*, l.name AS level_name,
                    (SELECT COUNT(*) FROM opportunity_follows f WHERE f.opportunity_id = o.id) AS follow_count
             $sql ORDER BY o.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute($args);
        Http::ok($stmt->fetchAll(), ['total' => $totalCount]);
    }

    public function show(array $p): void
    {
        Http::requireAuth();
        $db = Database::get();
        $o = $db->prepare(
            'SELECT o.*, l.name AS level_name FROM opportunities o
             LEFT JOIN distributor_levels l ON l.id = o.level_id WHERE o.id = ?'
        );
        $o->execute([(int)$p['id']]);
        $opp = $o->fetch();
        if (!$opp) Http::fail('商机不存在', 404);
        $f = $db->prepare('SELECT * FROM opportunity_follows WHERE opportunity_id = ? ORDER BY id DESC');
        $f->execute([(int)$p['id']]);
        $opp['follows'] = $f->fetchAll();
        Http::ok($opp);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $b = Http::body();
        if (empty($b['name'])) Http::fail('客户名称不能为空');
        $cols = array_values(array_intersect($this->fields, array_keys($b)));
        $ph = implode(',', array_fill(0, count($cols), '?'));
        $stmt = Database::get()->prepare('INSERT INTO opportunities (' . implode(',', $cols) . ") VALUES ($ph)");
        $stmt->execute(array_map(fn($c) => $b[$c] === '' ? null : $b[$c], $cols));
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $cols = array_values(array_intersect($this->fields, array_keys($b)));
        if (!$cols) Http::fail('无可更新字段');
        $set = implode(',', array_map(fn($c) => "$c = ?", $cols));
        $args = array_map(fn($c) => $b[$c] === '' ? null : $b[$c], $cols);
        $args[] = (int)$p['id'];
        $stmt = Database::get()->prepare("UPDATE opportunities SET $set WHERE id = ?");
        $stmt->execute($args);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $p): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare('DELETE FROM opportunities WHERE id = ?');
        $stmt->execute([(int)$p['id']]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }

    /** 报价/开票取价：直接客户用原价(含税)，分销客户用其等级该分类拿货价 */
    public function quote(array $p): void
    {
        Http::requireAuth();
        $db = Database::get();
        $o = $db->prepare(
            'SELECT o.*, l.name AS level_name FROM opportunities o
             LEFT JOIN distributor_levels l ON l.id = o.level_id WHERE o.id = ?'
        );
        $o->execute([(int)$p['id']]);
        $opp = $o->fetch();
        if (!$opp) Http::fail('商机不存在', 404);

        $isDist  = ($opp['type'] ?? 'direct') === 'distributor';
        $levelId = (int)($opp['level_id'] ?? 0);
        $defDisc = 0.0;
        $catDisc = [];
        if ($isDist && $levelId) {
            $defDisc = (float)$db->query("SELECT discount_rate FROM distributor_levels WHERE id = $levelId")->fetchColumn();
            $r = $db->prepare('SELECT category_id, discount_rate FROM level_category_rates WHERE level_id = ?');
            $r->execute([$levelId]);
            foreach ($r as $row) $catDisc[(int)$row['category_id']] = (float)$row['discount_rate'];
        }

        $prods = $db->query(
            "SELECT p.name, p.spec, p.image, p.category_id, c.name AS category_name, p.box_price_rp, p.price_taxfree_rp
             FROM products p LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.status = 1 ORDER BY c.sort, c.id, p.id"
        )->fetchAll();

        $items = [];
        foreach ($prods as $pr) {
            $retail = $pr['box_price_rp'] !== null ? (float)$pr['box_price_rp']
                    : ($pr['price_taxfree_rp'] !== null ? (float)$pr['price_taxfree_rp'] : null);
            if ($retail === null)      $unit = null;
            elseif ($isDist) { $disc = $catDisc[(int)$pr['category_id']] ?? $defDisc; $unit = $disc > 0 ? round($retail * $disc) : $retail; }
            else                        $unit = $retail; // 直接客户：原价
            $items[] = [
                'name' => $pr['name'], 'spec' => $pr['spec'], 'image' => $pr['image'],
                'category_name' => $pr['category_name'], 'unit_price' => $unit,
            ];
        }
        Http::ok(['opportunity' => $opp, 'items' => $items, 'is_distributor' => $isDist]);
    }

    /** 保存一条报价/开票记录 */
    public function saveDoc(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $type = ($b['type'] ?? 'quote') === 'invoice' ? 'invoice' : 'quote';
        $stmt = Database::get()->prepare(
            'INSERT INTO opportunity_docs (opportunity_id, type, total, items_json) VALUES (?,?,?,?)'
        );
        $stmt->execute([
            (int)$p['id'], $type, (float)($b['total'] ?? 0),
            json_encode($b['items'] ?? [], JSON_UNESCAPED_UNICODE),
        ]);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    /** 某商机的报价/开票记录列表 */
    public function docs(array $p): void
    {
        Http::requireAuth();
        $s = Database::get()->prepare(
            'SELECT * FROM opportunity_docs WHERE opportunity_id = ? ORDER BY id DESC'
        );
        $s->execute([(int)$p['id']]);
        Http::ok($s->fetchAll());
    }

    /** 新增跟进记录；可同时带 stage / next_follow_at 一起更新 */
    public function addFollow(array $p): void
    {
        Http::requireAdmin();
        $b = Http::body();
        $id = (int)$p['id'];
        $content = trim($b['content'] ?? '');
        if ($content === '') Http::fail('跟进内容不能为空');
        $db = Database::get();
        $db->prepare('INSERT INTO opportunity_follows (opportunity_id, content) VALUES (?,?)')
           ->execute([$id, $content]);
        // 顺带更新阶段/下次跟进
        $sets = [];
        $args = [];
        if (isset($b['stage']) && $b['stage'] !== '')          { $sets[] = 'stage = ?';          $args[] = $b['stage']; }
        if (array_key_exists('next_follow_at', $b))            { $sets[] = 'next_follow_at = ?'; $args[] = $b['next_follow_at'] ?: null; }
        if ($sets) {
            $args[] = $id;
            $db->prepare('UPDATE opportunities SET ' . implode(',', $sets) . ' WHERE id = ?')->execute($args);
        }
        Http::ok(['ok' => 1]);
    }
}
