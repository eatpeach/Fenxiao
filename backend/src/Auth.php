<?php
namespace App;

class Auth
{
    private static function secret(): string
    {
        return (require __DIR__ . '/../config.php')['jwt_secret'];
    }

    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function b64d(string $s): string
    {
        return base64_decode(strtr($s, '-_', '+/'));
    }

    /** 签发简易 JWT（HS256），零依赖 */
    public static function issue(array $payload): string
    {
        $config = require __DIR__ . '/../config.php';
        $header  = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload['exp'] = time() + $config['token_ttl'];
        $h = self::b64(json_encode($header));
        $p = self::b64(json_encode($payload));
        $sig = self::b64(hash_hmac('sha256', "$h.$p", self::secret(), true));
        return "$h.$p.$sig";
    }

    /** 校验并返回 payload，失败返回 null */
    public static function verify(?string $token): ?array
    {
        if (!$token) return null;
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$h, $p, $sig] = $parts;
        $expected = self::b64(hash_hmac('sha256', "$h.$p", self::secret(), true));
        if (!hash_equals($expected, $sig)) return null;
        $payload = json_decode(self::b64d($p), true);
        if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
        return $payload;
    }

    /** 从请求头取出当前用户 payload，未登录返回 null */
    public static function current(): ?array
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth = $headers['Authorization'] ?? $headers['authorization']
            ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (stripos($auth, 'Bearer ') === 0) {
            return self::verify(substr($auth, 7));
        }
        return null;
    }
}
