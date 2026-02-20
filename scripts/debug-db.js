require('dotenv').config();
const { createClient } = require('@libsql/client/http');

const url = process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://');

const db = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

db.execute('SELECT 1')
    .then(r => console.log('OK:', JSON.stringify(r)))
    .catch(e => {
        console.error('Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
    });
