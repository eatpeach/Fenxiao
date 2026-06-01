<?php
// 导入非茶类商品（酒/烟/特产/茶桌/屏风/茶具）到 products。幂等：先清这几类再插入。
// 用法： php backend/seed_catalog.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();

$file = __DIR__ . '/seed/catalog.json';
$rows = json_decode(file_get_contents($file), true);
if (!is_array($rows)) { fwrite(STDERR, "catalog.json 读取失败\n"); exit(1); }

// 分类名 -> id
$getCat = $db->prepare('SELECT id FROM categories WHERE name = ?');
$catId = function (string $name) use ($getCat): int {
    $getCat->execute([$name]);
    return (int)$getCat->fetchColumn();
};

$cats = ['酒', '烟', '特产', '茶桌', '屏风', '茶具'];
$ids = [];
foreach ($cats as $c) {
    $id = $catId($c);
    if (!$id) { fwrite(STDERR, "分类 $c 不存在，请先跑 seed.php\n"); exit(1); }
    $ids[$c] = $id;
}

// 幂等：清掉这几类旧数据
$del = $db->prepare('DELETE FROM products WHERE category_id = ?');
foreach ($ids as $id) $del->execute([$id]);

$ins = $db->prepare(
    'INSERT INTO products
     (category_id, supplier_id, brand, product_code, barcode, name, spec, origin, unit, qty_per_box,
      box_price_rp, price_taxfree_rp, bulk_price_rp, cost_price_rp, image, description)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
);

$count = 0;
foreach ($rows as $p) {
    $cid = $ids[$p['category']] ?? null;
    if (!$cid) continue;
    $ins->execute([
        $cid,
        $p['supplier'] ?? null,
        $p['brand'] ?? null,
        $p['code'] ?? '',
        $p['barcode'] ?? '',
        $p['name'],
        $p['spec'] ?? '',
        $p['origin'] ?? '',
        $p['unit'] ?? '',
        $p['qty'] ?? null,
        $p['box'] ?? null,
        $p['taxfree'] ?? null,
        $p['bulk'] ?? null,
        $p['cost'] ?? null,
        $p['image'] ?? '',
        $p['desc'] ?? '',
    ]);
    $count++;
}
echo "✅ 已导入非茶类商品 $count 条" . PHP_EOL;
