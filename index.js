const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "imperio-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// 🔗 CONEXÃO COM POSTGRESQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ===== CRIAR TABELAS AUTOMATICAMENTE =====
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      senha VARCHAR(200)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      preco NUMERIC,
      estoque INTEGER
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      telefone VARCHAR(20),
      email VARCHAR(100),
      endereco VARCHAR(200),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      total NUMERIC,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

criarTabelas();

// ================= ROTAS =================

// CADASTRAR PRODUTO
app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  const result = await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3) RETURNING *",
    [nome, preco, estoque]
  );
  res.json(result.rows[0]);
});

// LISTAR PRODUTOS
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
  res.json(result.rows);
});

// CADASTRAR CLIENTE
app.post("/clientes", async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;
  const result = await pool.query(
    "INSERT INTO clientes (nome, telefone, email, endereco) VALUES ($1,$2,$3,$4) RETURNING *",
    [nome, telefone, email, endereco]
  );
  res.json(result.rows[0]);
});

// LISTAR CLIENTES
app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
  res.json(result.rows);
});

// CRIAR PEDIDO
app.post("/pedidos", async (req, res) => {
  const { cliente_id, total } = req.body;
  const result = await pool.query(
    "INSERT INTO pedidos (cliente_id, total) VALUES ($1,$2) RETURNING *",
    [cliente_id, total]
  );
  res.json({
    mensagem: "Pedido criado com sucesso",
    pedido: result.rows[0],
  });
});

// DASHBOARD
app.get("/dashboard", async (req, res) => {
  const vendas = await pool.query("SELECT SUM(total) FROM pedidos");
  const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const estoqueBaixo = await pool.query(
    "SELECT COUNT(*) FROM produtos WHERE estoque < 5"
  );

  res.json({
    vendas_totais: vendas.rows[0].sum || 0,
    total_pedidos: pedidos.rows[0].count,
    total_clientes: clientes.rows[0].count,
    produtos_estoque_baixo: estoqueBaixo.rows[0].count,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
