<?php
// 把 public/img 下按"条码"命名的图片挂到对应商品。幂等，可反复执行。
// 用法： php backend/import_images.php
require __DIR__ . '/src/Database.php';

use App\Database;

$dir = __DIR__ . '/public/img';
$db  = Database::get();
$upd = $db->prepare('UPDATE products SET image = ? WHERE barcode = ? AND (image IS NULL OR image = "")');

$matched = 0;
foreach (glob($dir . '/*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE) as $f) {
    $base    = basename($f);
    $barcode = pathinfo($base, PATHINFO_FILENAME);
    if ($barcode === '') continue;
    $upd->execute(['/img/' . $base, $barcode]);
    $matched += $upd->rowCount();
}
echo "✅ 已为 $matched 个商品挂上图片" . PHP_EOL;
