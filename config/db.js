const { Pool } = require('pg');

// Enable SSL for Render PostgreSQL (required)
const isRenderDB = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDB ? { rejectUnauthorized: false } : false
});

module.exports = pool;
