<?php
// 建库：执行 schema.sql。用法： php backend/migrate.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();
$sql = file_get_contents(__DIR__ . '/schema.sql');
$db->exec($sql);

// ---- 增量升级：为已存在的库补加新列（幂等）----
$colExists = function (string $table, string $col) use ($db): bool {
    foreach ($db->query("PRAGMA table_info($table)") as $r) {
        if ($r['name'] === $col) return true;
    }
    return false;
};
$adds = [
    ['products', 'supplier_id', 'INTEGER'],
    ['products', 'brand', 'TEXT'],
    ['products', 'price_taxfree_rp', 'REAL'],
];
foreach ($adds as [$t, $col, $type]) {
    if (!$colExists($t, $col)) {
        $db->exec("ALTER TABLE $t ADD COLUMN $col $type");
        echo "  + 新增列 $t.$col\n";
    }
}

// ---- 依赖新列的索引：补列之后再建 ----
$db->exec('CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)');
$db->exec('CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)');

echo "✅ 数据库已初始化/升级: " . (require __DIR__ . '/config.php')['db_path'] . PHP_EOL;
