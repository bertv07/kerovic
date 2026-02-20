const { createClient } = require('@libsql/client');

// Force https:// transport — avoids WebSocket issues on Render and native binary issues on Windows
const db = createClient({
  url: (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = db;
