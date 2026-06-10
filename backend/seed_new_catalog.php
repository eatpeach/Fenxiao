<?php
// 重导茶叶/茶桌：删除「茶」「茶桌」现有产品（保留 老白茶 / 陈皮白茶），再导入 catalog_new.json。
// 茶叶含税成本=售价×0.5，茶桌(含竹制家具)含税成本=售价×0.8（已在 json 里算好 box=售价 / cost）。
// 用法： php backend/seed_new_catalog.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();
$rows = json_decode(file_get_contents(__DIR__ . '/seed/catalog_new.json'), true);
if (!is_array($rows)) { fwrite(STDERR, "catalog_new.json 读取失败\n"); exit(1); }

// 分类名 -> id
$getCat = $db->prepare('SELECT id FROM categories WHERE name = ?');
$catId = function (string $n) use ($getCat): int { $getCat->execute([$n]); return (int)$getCat->fetchColumn(); };
$teaId = $catId('茶'); $deskId = $catId('茶桌');
if (!$teaId || !$deskId) { fwrite(STDERR, "缺少『茶』或『茶桌』分类，请先跑 seed.php\n"); exit(1); }

// 删除旧的「茶」「茶桌」，但保留 老白茶 / 陈皮白茶
$del = $db->prepare(
    "DELETE FROM products
     WHERE category_id IN ($teaId, $deskId)
       AND name NOT LIKE '%老白茶%'
       AND name NOT LIKE '%陈皮白茶%'"
);
$del->execute();
echo "已删除旧茶/茶桌 {$del->rowCount()} 条（老白茶、陈皮白茶已保留）\n";

$ins = $db->prepare(
    'INSERT INTO products
     (category_id, product_code, barcode, name, spec, origin, unit, qty_per_box,
      box_price_rp, price_taxfree_rp, bulk_price_rp, cost_price_rp, image, description)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
);

$cnt = 0;
foreach ($rows as $p) {
    $cid = $p['category'] === '茶' ? $teaId : $deskId;
    $ins->execute([
        $cid,
        $p['code'] ?? '',
        $p['barcode'] ?? '',
        $p['name'],
        $p['spec'] ?? '',
        $p['origin'] ?? '',
        $p['unit'] ?? '',
        null,
        $p['box'] ?? null,
        $p['taxfree'] ?? null,
        $p['bulk'] ?? null,
        $p['cost'] ?? null,
        '',
        $p['desc'] ?? '',
    ]);
    $cnt++;
}
echo "已导入新产品 $cnt 条（茶 17 / 茶桌 68）\n";
echo "提示：再跑一次  php backend/import_images.php  按条码/编码挂图片\n";
