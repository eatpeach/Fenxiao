<?php
// 去掉「屏风」分类：其下商品并入「茶桌」，再删除该分类。幂等。
// 用法： php backend/remove_screen_category.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();
$pf = (int)$db->query("SELECT id FROM categories WHERE name = '屏风'")->fetchColumn();
if (!$pf) { echo "没有「屏风」分类，无需处理\n"; exit; }

$desk = (int)$db->query("SELECT id FROM categories WHERE name = '茶桌'")->fetchColumn();
$n = 0;
if ($desk) {
    $s = $db->prepare('UPDATE products SET category_id = ? WHERE category_id = ?');
    $s->execute([$desk, $pf]);
    $n = $s->rowCount();
}
$db->prepare('DELETE FROM categories WHERE id = ?')->execute([$pf]);
echo "已删除「屏风」分类；其下 $n 个商品并入「茶桌」\n";
