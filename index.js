const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// =============================
// CONEXÃO COM POSTGRES (Render)
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =============================
// CRIAR TABELAS AUTOMATICAMENTE
// =============================
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150),
        preco NUMERIC(10,2),
        estoque INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tabelas criadas/verificadas com sucesso!");
  } catch (error)
