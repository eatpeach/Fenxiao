<?php
// 去除重复的茶叶商品：按 条码(无则品名) 归并，保留 id 最小的一条；
// 重复项上的订单明细先并到保留项，图片补给保留项，再删除重复项。幂等。
// 用法： php backend/dedupe_tea.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();

$catId = (int)$db->query("SELECT id FROM categories WHERE name = '茶'")->fetchColumn();
if (!$catId) { echo "没有「茶」分类\n"; exit; }

$rows = $db->query(
    "SELECT id, name, barcode, image FROM products WHERE category_id = $catId ORDER BY id"
)->fetchAll();

$keepBy = [];   // key => 保留的 id
$dupes  = [];   // 重复 id => 保留 id
$setImg = $db->prepare('UPDATE products SET image = ? WHERE id = ? AND (image IS NULL OR image = "")');

foreach ($rows as $r) {
    $bc  = trim((string)$r['barcode']);
    $key = $bc !== '' ? 'bc:' . $bc : 'nm:' . trim((string)$r['name']);
    if (!isset($keepBy[$key])) {
        $keepBy[$key] = (int)$r['id'];
    } else {
        $keptId = $keepBy[$key];
        $dupes[(int)$r['id']] = $keptId;
        if (!empty($r['image'])) $setImg->execute([$r['image'], $keptId]); // 保图
    }
}

if (!$dupes) { echo "✅ 茶叶无重复，共 " . count($rows) . " 条\n"; exit; }

$repoint = $db->prepare('UPDATE order_items SET product_id = ? WHERE product_id = ?');
$del     = $db->prepare('DELETE FROM products WHERE id = ?');
$db->beginTransaction();
foreach ($dupes as $dup => $keep) {
    $repoint->execute([$keep, $dup]);
    $del->execute([$dup]);
    echo "  删除重复茶叶 id=$dup（并入 $keep）\n";
}
$db->commit();
echo "✅ 已去除 " . count($dupes) . " 条重复，剩余 " . (count($rows) - count($dupes)) . " 条\n";
