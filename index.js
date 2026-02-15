const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =======================
// CRIAR TABELAS AUTOMÁTICO
// =======================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      estoque INTEGER NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20),
      email VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(50) UNIQUE NOT NULL,
      senha VARCHAR(100) NOT NULL,
      nivel VARCHAR(20) DEFAULT 'admin'
    );
  `);
}

criarTabelas();

// =======================
// DASHBOARD
// =======================
app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
  const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Produtos: ${produtos.rows[0].count}</p>
    <p>Clientes: ${clientes.rows[0].count}</p>
    <p>Pedidos: ${pedidos.rows[0].count}</p>
    <p>Vendas Totais: R$ ${vendas.rows[0].coalesce}</p>
    <br>
    <a href="/produtos">Produtos</a><br>
    <a href="/clientes">Clientes</a>
  `);
});

// =======================
// PRODUTOS
// =======================
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
    <h1>Produtos</h1>
    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome" required />
      <input name="preco" placeholder="Preço" required />
      <input name="estoque" placeholder="Estoque" required />
      <button>Salvar</button>
    </form>
    <hr>
    ${result.rows.map(p => `
      ${p.nome} - R$ ${p.preco} - Estoque: ${p.estoque}
      <form method="POST" action="/deletar-produto/${p.id}">
        <button>Excluir</button>
      </form>
      <br>
    `).join("")}
    <br><a href="/">Voltar</a>
  `);
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3)",
    [nome, preco, estoque]
  );
  res.redirect("/produtos");
});

app.post("/deletar-produto/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
  res.redirect("/produtos");
});

// =======================
// CLIENTES
// =======================
app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(`
    <h1>Clientes</h1>
    <form method="POST" action="/clientes">
      <input name="nome" placeholder="Nome" required />
      <input name="telefone" placeholder="Telefone" />
      <input name="email" placeholder="Email" />
      <button>Salvar</button>
    </form>
    <hr>
    ${result.rows.map(c => `
      ${c.nome} - ${c.telefone || ""} - ${c.email || ""}
      <form method="POST" action="/deletar-cliente/${c.id}">
        <button>Excluir</button>
      </form>
      <br>
    `).join("")}
    <br><a href="/">Voltar</a>
  `);
});

app.post("/clientes", async (req, res) => {
  const { nome, telefone, email } = req.body;
  await pool.query(
    "INSERT INTO clientes (nome, telefone, email) VALUES ($1,$2,$3)",
    [nome, telefone, email]
  );
  res.redirect("/clientes");
});

app.post("/deletar-cliente/:id", async (req, res) => {
  await pool.query("DELETE FROM clientes WHERE id=$1", [req.params.id]);
  res.redirect("/clientes");
});

// =======================
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando 🚀");
});
