<?php
return [
    'db_path'    => __DIR__ . '/data/fenxiao.sqlite',
    'jwt_secret' => getenv('FENXIAO_SECRET') ?: 'change-me-in-production',
    'token_ttl'  => 7 * 24 * 3600,
];
