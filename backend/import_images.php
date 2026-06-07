<?php
// 把 public/img 下的图片按「条码或产品编码」挂到对应商品。幂等，可反复执行。
// 用法： php backend/import_images.php
require __DIR__ . '/src/Database.php';

use App\Database;

$dir = __DIR__ . '/public/img';
$db  = Database::get();
// 文件名(去扩展名) 同时按 条码 或 产品编码 匹配；只填还没图的商品
$upd = $db->prepare(
    'UPDATE products SET image = ?
     WHERE (barcode = ? OR product_code = ?) AND (image IS NULL OR image = "")'
);

// 不依赖 GLOB_BRACE，逐扩展名收集（含大写）
$exts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$files = [];
foreach ($exts as $e) {
    foreach (glob($dir . '/*.' . $e) ?: [] as $f) $files[] = $f;
    foreach (glob($dir . '/*.' . strtoupper($e)) ?: [] as $f) $files[] = $f;
}

$matched = 0;
foreach ($files as $f) {
    $base = basename($f);
    $key  = pathinfo($base, PATHINFO_FILENAME);
    if ($key === '') continue;
    $upd->execute(['/img/' . $base, $key, $key]);
    $matched += $upd->rowCount();
}
echo "✅ 已为 $matched 个商品挂上图片" . PHP_EOL;
