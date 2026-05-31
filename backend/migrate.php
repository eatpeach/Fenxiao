<?php
// 建库：执行 schema.sql。用法： php backend/migrate.php
require __DIR__ . '/src/Database.php';

use App\Database;

$sql = file_get_contents(__DIR__ . '/schema.sql');
Database::get()->exec($sql);
echo "✅ 数据库已初始化: " . (require __DIR__ . '/config.php')['db_path'] . PHP_EOL;
