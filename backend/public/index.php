<?php
declare(strict_types=1);

// ---- 简易自动加载（App\ 命名空间 -> src/）----
spl_autoload_register(function (string $class) {
    if (strncmp($class, 'App\\', 4) !== 0) return;
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (is_file($path)) require $path;
});
require __DIR__ . '/../src/helpers.php';

use App\Router;
use App\Http;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Controllers\CategoryController;
use App\Controllers\SupplierController;
use App\Controllers\LevelController;
use App\Controllers\DistributorController;
use App\Controllers\OrderController;
use App\Controllers\CommissionController;
use App\Controllers\PaymentController;
use App\Controllers\AccountController;
use App\Controllers\WithdrawalController;
use App\Controllers\UploadController;

// ---- CORS ----
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$router = new Router();

$router->post('/api/login',        fn() => (new AuthController())->login());
$router->get('/api/currentUser',   fn() => (new AuthController())->currentUser());

$router->get('/api/products',      fn() => (new ProductController())->index());
$router->get('/api/product-brands', fn() => (new ProductController())->brands());
$router->get('/api/products/{id}', fn($p) => (new ProductController())->show($p));
$router->post('/api/products',     fn() => (new ProductController())->store());
$router->put('/api/products/{id}', fn($p) => (new ProductController())->update($p));
$router->delete('/api/products/{id}', fn($p) => (new ProductController())->destroy($p));

$router->get('/api/categories',        fn() => (new CategoryController())->index());
$router->post('/api/categories',       fn() => (new CategoryController())->store());
$router->put('/api/categories/{id}',   fn($p) => (new CategoryController())->update($p));
$router->delete('/api/categories/{id}',fn($p) => (new CategoryController())->destroy($p));

$router->get('/api/suppliers',         fn() => (new SupplierController())->index());
$router->post('/api/suppliers',        fn() => (new SupplierController())->store());
$router->put('/api/suppliers/{id}',    fn($p) => (new SupplierController())->update($p));
$router->delete('/api/suppliers/{id}', fn($p) => (new SupplierController())->destroy($p));

$router->get('/api/levels',        fn() => (new LevelController())->index());
$router->get('/api/levels/{id}/rates', fn($p) => (new LevelController())->rates($p));
$router->put('/api/levels/{id}/rates', fn($p) => (new LevelController())->saveRates($p));
$router->post('/api/levels',       fn() => (new LevelController())->store());
$router->put('/api/levels/{id}',   fn($p) => (new LevelController())->update($p));
$router->delete('/api/levels/{id}',fn($p) => (new LevelController())->destroy($p));

$router->get('/api/distributors',      fn() => (new DistributorController())->index());
$router->get('/api/distributors/{id}/quote', fn($p) => (new DistributorController())->quote($p));
$router->post('/api/distributors',     fn() => (new DistributorController())->store());
$router->put('/api/distributors/{id}', fn($p) => (new DistributorController())->update($p));

$router->get('/api/orders',      fn() => (new OrderController())->index());
$router->get('/api/orders/{id}', fn($p) => (new OrderController())->show($p));
$router->post('/api/orders',     fn() => (new OrderController())->store());
$router->post('/api/orders/{id}/dun', fn($p) => (new OrderController())->dun($p));

$router->get('/api/payments',              fn() => (new PaymentController())->index());
$router->post('/api/payments',             fn() => (new PaymentController())->store());
$router->post('/api/payments/{id}/confirm', fn($p) => (new PaymentController())->confirm($p));
$router->post('/api/payments/{id}/reject',  fn($p) => (new PaymentController())->reject($p));

$router->get('/api/commissions',            fn() => (new CommissionController())->index());
$router->post('/api/commissions/{id}/settle', fn($p) => (new CommissionController())->settle($p));

$router->get('/api/withdrawals',              fn() => (new WithdrawalController())->index());
$router->post('/api/withdrawals',             fn() => (new WithdrawalController())->store());
$router->post('/api/withdrawals/{id}/review', fn($p) => (new WithdrawalController())->review($p));

$router->get('/api/accounts',        fn() => (new AccountController())->index());
$router->post('/api/accounts',        fn() => (new AccountController())->store());
$router->put('/api/accounts/{id}',    fn($p) => (new AccountController())->update($p));
$router->delete('/api/accounts/{id}', fn($p) => (new AccountController())->destroy($p));

$router->post('/api/upload', fn() => (new UploadController())->store());

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $path);
} catch (\Throwable $e) {
    Http::fail('服务器错误: ' . $e->getMessage(), 500);
}
