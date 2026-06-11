<?php
// 区分重复的 Z-018「璟石」（1.4m / 1.6m），不用全表重导。幂等。
// 用法： php backend/fix_z018.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();
$a = $db->prepare("UPDATE products SET name='璟石1.4M' WHERE product_code='Z-018' AND spec LIKE '1.4%'");
$a->execute();
$b = $db->prepare("UPDATE products SET name='璟石1.6M', product_code='Z-018B' WHERE product_code='Z-018' AND spec LIKE '1.6%'");
$b->execute();
echo "已区分 Z-018：1.4M {$a->rowCount()} 条，1.6M→Z-018B {$b->rowCount()} 条\n";
