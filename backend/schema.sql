PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS distributor_levels (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    commission_rate REAL NOT NULL DEFAULT 0,   -- 该级直接佣金率 0~1
    discount_rate REAL NOT NULL DEFAULT 0,     -- 拿货折扣率 0~1
    sort          INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,               -- password_hash
    name        TEXT,
    phone       TEXT,
    role        TEXT NOT NULL DEFAULT 'distributor', -- admin | distributor
    level_id    INTEGER REFERENCES distributor_levels(id),
    parent_id   INTEGER REFERENCES users(id),         -- 推广上级
    balance     REAL NOT NULL DEFAULT 0,              -- 可提现余额
    status      INTEGER NOT NULL DEFAULT 1,           -- 1启用 0停用
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    sort       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    contact    TEXT,
    phone      TEXT,
    remark     TEXT,
    sort       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id    INTEGER REFERENCES categories(id),
    supplier_id    INTEGER REFERENCES suppliers(id),
    brand          TEXT,      -- 品牌（如白酒：贵州茅台/五粮液…）
    product_code   TEXT,
    barcode        TEXT,
    name           TEXT NOT NULL,
    image          TEXT,
    spec           TEXT,
    origin         TEXT,
    unit           TEXT,
    qty_per_box    INTEGER,
    price_per_brew_rp REAL,   -- 单泡价格/RP
    price_rmb      REAL,      -- 单价/RMB
    box_price_rp   REAL,      -- 一盒单价/RP（酒水=含税客户价）
    price_taxfree_rp REAL,    -- 免税客户价/RP
    bulk_price_rp  REAL,      -- 批量拿货价
    cost_price_rp  REAL,      -- 成本价
    description    TEXT,
    status         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no     TEXT NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    total_amount REAL NOT NULL DEFAULT 0,
    currency     TEXT NOT NULL DEFAULT 'RP',  -- RP | RMB
    status       TEXT NOT NULL DEFAULT 'pending', -- pending|paid|shipped|done|cancelled
    remark       TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    price       REAL NOT NULL,
    qty         INTEGER NOT NULL,
    subtotal    REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),  -- 受益分销商
    amount      REAL NOT NULL,
    rate        REAL NOT NULL,
    level       INTEGER NOT NULL DEFAULT 1,             -- 第几层
    status      TEXT NOT NULL DEFAULT 'pending',        -- pending|settled
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    amount      REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',        -- pending|approved|rejected|paid
    remark      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id);
