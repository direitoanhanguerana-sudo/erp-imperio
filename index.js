const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   CONEXÃO COM POSTGRES
=================================*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* ===============================
   CRIAR TABELAS AUTOMATICAMENTE
=================================*/
async function criarTabelas() {
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

/* ===============================
   DASHBOARD (ABERTO)
=================================*/
app.get("/dashboard", async (req, res) => {
  const vendas = await pool.query(
    "SELECT COALESCE(SUM(total),0) as total FROM pedidos"
  );

  const pedidos = await pool.query(
    "SELECT COUNT(*) FROM pedidos"
  );

  const clientes = await pool.query(
    "SELECT COUNT(*) FROM clientes"
  );

  const estoqueBaixo = await pool.query(
    "SELECT COUNT(*) FROM produtos WHERE estoque < 10"
  );

  res.send(`
  <html>
  <head>
    <title>ERP Império Distribuidora</title>
    <style>
      body { font-family: Arial; background:#f4f6f9; text-align:center; }
      h1 { margin-top:30px; }
      .card { 
        display:inline-block;
        background:white;
        padding:20px;
        margin:15px;
        border-radius:10px;
        box-shadow:0 4px 8px rgba(0,0,0,0.1);
        width:200px;
      }
      .valor { font-size:22px; color:#27ae60; margin-top:10px; }
      .btn {
        padding:10px 20px;
        background:#2980b9;
        color:white;
        border:none;
        border-radius:5px;
        cursor:pointer;
        margin:5px;
      }
    </style>
  </head>
  <body>
    <h1>🚀 ERP Império Distribuidora</h1>

    <div class="card">
      <div>Vendas Totais</div>
      <div class="valor">R$ ${vendas.rows[0].total}</div>
    </div>

    <div class="card">
      <div>Total Pedidos</div>
      <div class="valor">${pedidos.rows[0].count}</div>
    </div>

    <div class="card">
      <div>Total Clientes</div>
      <div class="valor">${clientes.rows[0].count}</div>
    </div>

    <div class="card">
      <div>Estoque Baixo</div>
      <div class="valor">${estoqueBaixo.rows[0].count}</div>
    </div>

    <br/><br/>
    <a href="/produtos"><button class="btn">Produtos</button></a>
    <a href="/clientes"><button class="btn">Clientes</button></a>
  </body>
  </html>
  `);
});

/* ===============================
   PRODUTOS
=================================*/
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;

  const result = await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3) RETURNING *",
    [nome, preco, estoque]
  );

  res.json(result.rows[0]);
});

/* ===============================
   CLIENTES
=================================*/
app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/clientes", async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;

  const result = await pool.query(
    "INSERT INTO clientes (nome, telefone, email, endereco) VALUES ($1,$2,$3,$4) RETURNING *",
    [nome, telefone, email, endereco]
  );

  res.json(result.rows[0]);
});

/* ===============================
   PEDIDOS
=================================*/
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

/* ===============================
   SERVIDOR
=================================*/
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
