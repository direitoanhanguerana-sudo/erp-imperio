const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ================= CRIAR TABELAS =================

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
      total NUMERIC(10,2) DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      preco_unitario NUMERIC(10,2) NOT NULL
    );
  `);
}

criarTabelas();

// ================= DASHBOARD =================

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
    <a href="/clientes">Clientes</a><br>
    <a href="/pedidos">Pedidos</a>
  `);
});

// ================= PEDIDOS =================

app.get("/pedidos", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");
  const produtos = await pool.query("SELECT * FROM produtos");

  res.send(`
    <h2>Novo Pedido</h2>
    <form method="POST" action="/pedidos">
      <select name="cliente_id" required>
        <option value="">Selecione Cliente</option>
        ${clientes.rows.map(c => `<option value="${c.id}">${c.nome}</option>`).join("")}
      </select>

      <select name="produto_id" required>
        <option value="">Selecione Produto</option>
        ${produtos.rows.map(p => `<option value="${p.id}">${p.nome} - R$ ${p.preco}</option>`).join("")}
      </select>

      <input type="number" name="quantidade" placeholder="Quantidade" required>
      <button type="submit">Criar Pedido</button>
    </form>
    <br><a href="/">Voltar</a>
  `);
});

app.post("/pedidos", async (req, res) => {
  const { cliente_id, produto_id, quantidade } = req.body;

  const produto = await pool.query(
    "SELECT * FROM produtos WHERE id=$1",
    [produto_id]
  );

  if (produto.rows.length === 0) return res.send("Produto não encontrado");

  const preco = produto.rows[0].preco;
  const estoque = produto.rows[0].estoque;

  if (estoque < quantidade)
    return res.send("Estoque insuficiente");

  const total = preco * quantidade;

  const pedido = await pool.query(
    "INSERT INTO pedidos (cliente_id, total) VALUES ($1,$2) RETURNING id",
    [cliente_id, total]
  );

  await pool.query(
    "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1,$2,$3,$4)",
    [pedido.rows[0].id, produto_id, quantidade, preco]
  );

  await pool.query(
    "UPDATE produtos SET estoque = estoque - $1 WHERE id=$2",
    [quantidade, produto_id]
  );

  res.redirect("/");
});

// ================= SERVIDOR =================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor rodando 🚀");
});
