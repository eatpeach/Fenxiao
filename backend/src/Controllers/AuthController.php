<?php
namespace App\Controllers;

use App\Database;
use App\Auth;
use App\Http;

class AuthController
{
    public function login(): void
    {
        $body = Http::body();
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';
        if ($username === '' || $password === '') {
            Http::fail('用户名和密码不能为空');
        }
        $stmt = Database::get()->prepare('SELECT * FROM users WHERE username = ? AND status = 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password'])) {
            Http::fail('用户名或密码错误', 401);
        }
        $token = Auth::issue([
            'uid'  => (int)$user['id'],
            'role' => $user['role'],
            'name' => $user['name'],
        ]);
        // Ant Design Pro 登录约定
        Http::json(['status' => 'ok', 'type' => 'account', 'token' => $token, 'role' => $user['role']]);
    }

    public function currentUser(): void
    {
        $payload = Http::requireAuth();
        $stmt = Database::get()->prepare(
            'SELECT id, username, name, phone, role, level_id, balance FROM users WHERE id = ?'
        );
        $stmt->execute([$payload['uid']]);
        $user = $stmt->fetch();
        if (!$user) Http::fail('用户不存在', 404);
        Http::ok($user);
    }
}
