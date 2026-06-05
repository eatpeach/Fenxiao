<?php
// 为没有群编号的分销商补号：从 1001 起，跳过含数字 4 的，按 id 顺序分配。
// 用法： php backend/backfill_group_no.php
require __DIR__ . '/src/Database.php';

use App\Database;

$db = Database::get();

function nextGroupNo($db): string
{
    $used = [];
    foreach ($db->query("SELECT group_no FROM users WHERE group_no IS NOT NULL AND group_no <> ''") as $r) {
        $used[(string)$r['group_no']] = true;
    }
    $n = 1001;
    while (strpos((string)$n, '4') !== false || isset($used[(string)$n])) $n++;
    return (string)$n;
}

$rows = $db->query(
    "SELECT id FROM users WHERE role = 'distributor' AND (group_no IS NULL OR group_no = '') ORDER BY id"
)->fetchAll();

$upd = $db->prepare('UPDATE users SET group_no = ? WHERE id = ?');
$c = 0;
foreach ($rows as $r) {
    $g = nextGroupNo($db);
    $upd->execute([$g, (int)$r['id']]);
    echo "  用户 #{$r['id']} → 群编号 $g" . PHP_EOL;
    $c++;
}
echo "✅ 已为 $c 个分销商补充群编号" . PHP_EOL;
