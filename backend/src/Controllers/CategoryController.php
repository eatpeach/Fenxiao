<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class CategoryController
{
    public function index(): void
    {
        Http::requireAuth();
        $rows = Database::get()->query(
            'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
             FROM categories c ORDER BY c.sort, c.id'
        )->fetchAll();
        Http::ok($rows);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $body = Http::body();
        if (empty($body['name'])) Http::fail('分类名不能为空');
        $stmt = Database::get()->prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
        $stmt->execute([$body['name'], (int)($body['sort'] ?? 0)]);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $params): void
    {
        Http::requireAdmin();
        $body = Http::body();
        $stmt = Database::get()->prepare('UPDATE categories SET name = ?, sort = ? WHERE id = ?');
        $stmt->execute([$body['name'] ?? '', (int)($body['sort'] ?? 0), (int)$params['id']]);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $params): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare('DELETE FROM categories WHERE id = ?');
        $stmt->execute([(int)$params['id']]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }
}
