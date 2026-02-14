const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0
    );
  `);
}

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

app.get("/dashboard", async (req, res) => {
  const vendas = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM pedidos");
  const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const estoqueBaixo = await pool.query("SELECT COUNT(*) FROM produtos WHERE estoque < 5");

  res.send(`
  <html>
  <head>
  <title>ERP Império</title>
  <style>
  body { background:#0f0f0f; color:white; font-family:Arial; text-align:center; }
  .card { background:#1c1c1c; padding:20px; margin:15px; border-radius:10px; display:inline-block; width:200px;}
  .valor { color:#00ff88; font-size:22px; font-weight:bold;}
  a { color:#00ff88; text-decoration:none; display:block; margin-top:20px;}
  </style>
  </head>
  <body>
  <h1>🚀 ERP Império Distribuidora</h1>
  <div class="card"><div>Vendas</div><div class="valor">R$ ${vendas.rows[0].total}</div></div>
  <div class="card"><div>Pedidos</div><div class="valor">${pedidos.rows[0].count}</div></div>
  <div class="card"><div>Clientes</div><div class="valor">${clientes.rows[0].count}</div></div>
  <div class="card"><div>Estoque Baixo</div><div class="valor">${estoqueBaixo.rows[0].count}</div></div>
  <a href="/produtos-ui">➕ Cadastrar Produto</a>
  </body>
  </html>
  `);
});

app.get("/produtos-ui", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  let lista = produtos.rows.map(p => `
    <tr>
      <td>${p.nome}</td>
      <td>R$ ${p.preco}</td>
      <td>${p.estoque}</td>
    </tr>
  `).join("");

  res.send(`
  <html>
  <head>
  <title>Produtos</title>
  <style>
  body { background:#0f0f0f; color:white; font-family:Arial; text-align:center;}
  input { padding:8px; margin:5px; border-radius:5px; border:none;}
  button { padding:10px 20px; background:#00ff88; border:none; border-radius:5px; cursor:pointer;}
  table { margin:auto; margin-top:20px; border-collapse:collapse;}
  td, th { padding:8px 15px; border-bottom:1px solid #333;}
  a { color:#00ff88; text-decoration:none; display:block; margin-top:20px;}
  </style>
  </head>
  <body>
  <h2>Cadastro de Produto</h2>
  <form method="POST" action="/produtos-form">
    <input name="nome" placeholder="Nome do produto" required/>
    <input name="preco" type="number" step="0.01" placeholder="Preço" required/>
    <input name="estoque" type="number" placeholder="Estoque" required/>
    <br><br>
    <button type="submit">Cadastrar</button>
  </form>

  <table>
    <tr><th>Nome</th><th>Preço</th><th>Estoque</th></tr>
    ${lista}
  </table>

  <a href="/dashboard">⬅ Voltar</a>
  </body>
  </html>
  `);
});

app.use(express.urlencoded({ extended: true }));

app.post("/produtos-form", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3)",
    [nome, preco, estoque]
  );
  res.redirect("/produtos-ui");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  await criarTabelas();
  console.log("Servidor rodando...");
});
