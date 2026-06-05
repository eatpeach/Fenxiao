<?php
// 初始化基础数据 + 导入茶类定价表。用法： php backend/seed.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();

function num($v): ?float
{
    $v = preg_replace('/[^0-9.]/', '', (string)$v);
    return $v === '' ? null : (float)$v;
}

// 1) 分类（按业务品类）
$categories = ['烟', '酒', '茶', '茶桌', '茶具', '屏风', '特产'];
$catIds = [];
$insCat = $db->prepare('INSERT OR IGNORE INTO categories (name, sort) VALUES (?, ?)');
$getCat = $db->prepare('SELECT id FROM categories WHERE name = ?');
foreach ($categories as $i => $name) {
    $insCat->execute([$name, $i]);
    $getCat->execute([$name]);
    $catIds[$name] = (int)$getCat->fetchColumn();
}
echo "✅ 分类已就绪: " . implode('、', $categories) . PHP_EOL;

// 2) 默认分销商等级
$levels = [
    ['普通分销商', 0.05, 0.95],
    ['银牌分销商', 0.08, 0.90],
    ['金牌分销商', 0.12, 0.85],
];
// 按名幂等：已存在则跳过（distributor_levels.name 无唯一约束，避免重复跑产生重复档位）
$findLvl = $db->prepare('SELECT COUNT(*) FROM distributor_levels WHERE name = ?');
$insLvl  = $db->prepare('INSERT INTO distributor_levels (name, commission_rate, discount_rate, sort) VALUES (?, ?, ?, ?)');
foreach ($levels as $i => $l) {
    $findLvl->execute([$l[0]]);
    if ((int)$findLvl->fetchColumn() === 0) {
        $insLvl->execute([$l[0], $l[1], $l[2], $i]);
    }
}
echo "✅ 分销商等级已就绪（固定 3 档）" . PHP_EOL;

// 3) 管理员账号 admin / admin123
$exists = $db->prepare('SELECT COUNT(*) FROM users WHERE username = ?');
$exists->execute(['admin']);
if (!$exists->fetchColumn()) {
    $db->prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
       ->execute(['admin', password_hash('admin123', PASSWORD_DEFAULT), '超级管理员', 'admin']);
    echo "✅ 管理员账号已创建: admin / admin123" . PHP_EOL;
} else {
    echo "ℹ️ 管理员账号已存在，跳过" . PHP_EOL;
}

// 4) 导入茶类定价表
$teaId = $catIds['茶'];
$fh = fopen(__DIR__ . '/seed/tea_prices.csv', 'r');
if (!$fh) { fwrite(STDERR, "找不到 tea_prices.csv\n"); exit(1); }

$ins = $db->prepare(
    'INSERT INTO products
     (category_id, product_code, barcode, name, spec, origin, unit, qty_per_box,
      price_per_brew_rp, price_rmb, box_price_rp, bulk_price_rp, cost_price_rp, description)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
);

$count = 0;
$first = true;
while (($row = fgetcsv($fh)) !== false) {
    if ($first) { $first = false; continue; } // 跳过表头
    if (trim((string)($row[3] ?? '')) === '') continue; // 无品名跳过
    $ins->execute([
        $teaId,
        trim((string)($row[1] ?? '')),   // 产品编码
        trim((string)($row[2] ?? '')),   // 条码
        trim((string)$row[3]),           // 中文品名
        trim((string)($row[5] ?? '')),   // 规格型号
        trim((string)($row[6] ?? '')),   // 产地
        trim((string)($row[7] ?? '')),   // 单位
        (int)num($row[8] ?? null),       // 一盒数量
        num($row[9] ?? null),            // 单泡价格/RP
        num($row[10] ?? null),           // 单价/RMB
        num($row[11] ?? null),           // 一盒单价/RP
        num($row[13] ?? null),           // 批量拿货价
        num($row[14] ?? null),           // 成本价
        trim((string)($row[12] ?? '')),  // 备注
    ]);
    $count++;
}
fclose($fh);
echo "✅ 已导入茶类商品 $count 条" . PHP_EOL;

// 5) 挂商品图片（public/img 下按条码命名）
require __DIR__ . '/import_images.php';
