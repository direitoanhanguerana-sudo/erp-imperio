const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* =========================
   CONEXÃO BANCO
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   CRIAR TABELAS AUTOMÁTICO
========================= */
async function criarTabelas() {
  try {

    // USUÁRIOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY
      );
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS usuario TEXT UNIQUE;
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS senha TEXT;
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS nivel TEXT;
    `);

    await pool.query(`
      INSERT INTO usuarios (usuario, senha, nivel)
      SELECT 'admin', '123456', 'admin'
      WHERE NOT EXISTS (
        SELECT 1 FROM usuarios WHERE usuario = 'admin'
      );
    `);

    // PRODUTOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        preco NUMERIC NOT NULL,
        estoque INTEGER NOT NULL
      );
    `);

    // CLIENTES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        telefone TEXT
      );
    `);

    // PEDIDOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        total NUMERIC,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas verificadas com sucesso ✅");

  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

criarTabelas();

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1 AND senha = $2",
      [usuario, senha]
    );

    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no login");
  }
});

/* =========================
   ROTAS PRINCIPAIS
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

/* =========================
   PORTA
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando 🚀");
});
