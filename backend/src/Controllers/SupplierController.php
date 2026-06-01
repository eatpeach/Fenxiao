<?php
namespace App\Controllers;

use App\Database;
use App\Http;

class SupplierController
{
    public function index(): void
    {
        Http::requireAuth();
        $rows = Database::get()->query(
            'SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count
             FROM suppliers s ORDER BY s.sort, s.id'
        )->fetchAll();
        Http::ok($rows);
    }

    public function store(): void
    {
        Http::requireAdmin();
        $body = Http::body();
        if (empty($body['name'])) Http::fail('供应商名称不能为空');
        $stmt = Database::get()->prepare(
            'INSERT INTO suppliers (name, contact, phone, remark, sort) VALUES (?,?,?,?,?)'
        );
        $stmt->execute([
            $body['name'],
            $body['contact'] ?? '',
            $body['phone'] ?? '',
            $body['remark'] ?? '',
            (int)($body['sort'] ?? 0),
        ]);
        Http::ok(['id' => (int)Database::get()->lastInsertId()]);
    }

    public function update(array $params): void
    {
        Http::requireAdmin();
        $body = Http::body();
        $stmt = Database::get()->prepare(
            'UPDATE suppliers SET name = ?, contact = ?, phone = ?, remark = ?, sort = ? WHERE id = ?'
        );
        $stmt->execute([
            $body['name'] ?? '',
            $body['contact'] ?? '',
            $body['phone'] ?? '',
            $body['remark'] ?? '',
            (int)($body['sort'] ?? 0),
            (int)$params['id'],
        ]);
        Http::ok(['updated' => $stmt->rowCount()]);
    }

    public function destroy(array $params): void
    {
        Http::requireAdmin();
        $stmt = Database::get()->prepare('DELETE FROM suppliers WHERE id = ?');
        $stmt->execute([(int)$params['id']]);
        Http::ok(['deleted' => $stmt->rowCount()]);
    }
}
