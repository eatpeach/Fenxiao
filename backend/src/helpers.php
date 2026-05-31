<?php
namespace App;

class Http
{
    public static function json($data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /** Ant Design Pro ProTable 约定的成功响应 */
    public static function ok($data = null, array $extra = []): void
    {
        self::json(array_merge(['success' => true, 'data' => $data], $extra));
    }

    public static function fail(string $message, int $code = 400): void
    {
        self::json(['success' => false, 'errorMessage' => $message], $code);
    }

    /** 读取 JSON 请求体 */
    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /** 要求已登录，否则 401 中断 */
    public static function requireAuth(): array
    {
        $user = Auth::current();
        if (!$user) self::fail('未登录或登录已过期', 401);
        return $user;
    }

    public static function requireAdmin(): array
    {
        $user = self::requireAuth();
        if (($user['role'] ?? '') !== 'admin') self::fail('需要管理员权限', 403);
        return $user;
    }
}
