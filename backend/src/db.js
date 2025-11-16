// db.js
require('dotenv').config();
const { Pool } = require('pg');

// Creamos un pool de conexiones a PostgreSQL usando DATABASE_URL del archivo .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exportamos un método para ejecutar queries
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
