require('dotenv').config();

// Use Node 18+ built-in fetch to hit Turso's HTTP API directly
const url = process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://');
const token = process.env.TURSO_AUTH_TOKEN;

async function execute(sql) {
    const res = await fetch(`${url}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                { type: 'execute', stmt: { sql } },
                { type: 'close' },
            ],
        }),
    });

    const data = await res.json();
    if (!res.ok || data.results?.[0]?.type === 'error') {
        throw new Error(JSON.stringify(data));
    }
    return data;
}

async function init() {
    console.log('Conectando a Turso:', url);

    await execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      image_url TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
    console.log('Tabla products creada (o ya existia).');

    await execute(`
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)
  `);
    console.log('Indice idx_products_category creado (o ya existia).');

    console.log('Base de datos inicializada correctamente.');
}

init().catch((err) => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
