<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class ProductController
{
    private array $fields = [
        'category_id', 'supplier_id', 'brand', 'product_code', 'barcode', 'name', 'image', 'spec',
        'origin', 'unit', 'qty_per_box', 'price_per_brew_rp', 'price_rmb',
        'box_price_rp', 'price_taxfree_rp', 'bulk_price_rp', 'cost_price_rp', 'description', 'status',
    ];

    public function index(): void
    {
        Http::requireAuth();
        $page    = max(1, (int)($_GET['current'] ?? 1));
        $size    = min(100, max(1, (int)($_GET['pageSize'] ?? 20)));
        $where   = [];
        $args    = [];
        if (!empty($_GET['name'])) {
            $where[] = 'p.name LIKE ?';
            $args[] = '%' . $_GET['name'] . '%';
        }
        if (!empty($_GET['category_id'])) {
            $where[] = 'p.category_id = ?';
            $args[] = (int)$_GET['category_id'];
        }
        if (!empty($_GET['supplier_id'])) {
            $where[] = 'p.supplier_id = ?';
            $args[] = (int)$_GET['supplier_id'];
        }
        if (!empty($_GET['brand'])) {
            $where[] = 'p.brand = ?';
            $args[] = $_GET['brand'];
        }
        $sql = 'FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN suppliers  s ON s.id = p.supplier_id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);

        $total = Database::get()->prepare("SELECT COUNT(*) $sql");
        $total->execute($args);
        $totalCount = (int)$total->fetchColumn();

        $offset = ($page - 1) * $size;
        $stmt = Database::get()->prepare(
            "SELECT p.*, c.name AS category_name, s.name AS supplier_name $sql ORDER BY p.id DESC LIMIT $size OFFSET $offset"
        );
        $stmt->execute($args);
        Http::ok($stmt->fetchAll(), ['total' => $totalCount, 'success' => true]);
    }

    public function brands(): void
    {
        Http::requireAuth();
        $sql = "SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> ''";
        $args = [];
        if (!empty($_GET['category_id'])) {
            $sql .= ' AND category_id = ?';
            $args[] = (int)$_GET['category_id'];
        }
        $sql .= ' ORDER BY brand';
        $stmt = Database::get()->prepare($sql);
        $stmt->execute($args);
        Http::ok(array_column($stmt->fetchAll(), 'brand'));
    }

    public function show(array $params): void
    {
        Http::requireAuth();
        $stmt = Database::get()->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([(int)$params['id']]);
        $row = $stmt->fetch();
        if (!$row) Http::fail('商品不存在', 404);
        Http::ok($row);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $body = Http::body();
        if (empty($body['name'])) Http::fail('品名不能为空');
        $cols = array_values(array_intersect($this->fields, array_keys($body)));
        $placeholders = implode(',', array_fill(0, count($cols), '?'));
        $sql = 'INSERT INTO products (' . implode(',', $cols) . ") VALUES ($placeholders)";
        $stmt = Database::get()->prepare($sql);
        $stmt->execute(array_map(fn($c) => $body[$c], $cols));
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $params): void
    {
        Http::requireAdmin();
        $body = Http::body();
        $cols = array_values(array_intersect($this->fields, array_keys($body)));
        if (!$cols) Http::fail('无可更新字段');
        $set = implode(',', array_map(fn($c) => "$c = ?", $cols));
        $args = array_map(fn($c) => $body[$c], $cols);
        $args[] = (int)$params['id'];
        $stmt = Database::get()->prepare("UPDATE products SET $set WHERE id = ?");
        $stmt->execute($args);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $params): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([(int)$params['id']]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }
}
