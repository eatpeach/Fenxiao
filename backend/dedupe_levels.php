<?php
// 分销商等级去重：同名只保留 id 最小的一条；其余档位上的分销商先归并到保留档再删除。
// 用法： php backend/dedupe_levels.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();

$rows = $db->query('SELECT id, name FROM distributor_levels ORDER BY id')->fetchAll();
$keep  = [];   // name => 保留的 id
$dupes = [];   // 重复 id => 保留 id
foreach ($rows as $r) {
    $n = $r['name'];
    if (!isset($keep[$n])) $keep[$n] = (int)$r['id'];
    else $dupes[(int)$r['id']] = $keep[$n];
}

if (!$dupes) {
    echo "✅ 无重复档位，当前共 " . count($rows) . " 档" . PHP_EOL;
} else {
    $updU = $db->prepare('UPDATE users SET level_id = ? WHERE level_id = ?');
    $delL = $db->prepare('DELETE FROM distributor_levels WHERE id = ?');
    foreach ($dupes as $dup => $keepId) {
        $updU->execute([$keepId, $dup]);
        $delL->execute([$dup]);
        echo "  合并等级 id=$dup → $keepId" . PHP_EOL;
    }
    echo "✅ 去重完成" . PHP_EOL;
}

echo "当前档位：" . PHP_EOL;
foreach ($db->query('SELECT id, name, commission_rate, discount_rate FROM distributor_levels ORDER BY sort, id') as $r) {
    echo "   #{$r['id']} {$r['name']}  佣金{$r['commission_rate']} 折扣{$r['discount_rate']}" . PHP_EOL;
}
