<?php
namespace App\Controllers;

use App\Http;

class UploadController
{
    /** 接收 multipart 字段 file，存到 public/uploads，返回可访问 url */
    public function store(): void
    {
        Http::requireAdmin();
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Http::fail('未收到文件或上传出错');
        }
        $f = $_FILES['file'];
        if ($f['size'] > 5 * 1024 * 1024) Http::fail('图片不能超过 5MB');

        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            Http::fail('仅支持 jpg/png/gif/webp 图片');
        }

        // 存到 public/img（nginx 已把 /img 当静态资源；/uploads 未配会被前端路由兜底成破图）
        $dir = __DIR__ . '/../../public/img';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            Http::fail('上传目录不可写', 500);
        }
        $name = 'up_' . date('Ymd') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) {
            Http::fail('保存失败，请检查 public/img 目录权限', 500);
        }
        Http::ok(['url' => '/img/' . $name]);
    }
}
