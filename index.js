const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   CRIAR TABELAS
========================= */

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
}

criarTabelas();

/* =========================
   DASHBOARD
========================= */

app.get("/", async (req, res) => {
  const totalProdutos = await pool.query("SELECT COUNT(*) FROM produtos");
  const totalClientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const totalPedidos = await pool.query("SELECT COUNT(*) FROM pedidos");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Produtos: ${totalProdutos.rows[0].count}</p>
    <p>Clientes: ${totalClientes.rows[0].count}</p>
    <p>Pedidos: ${totalPedidos.rows[0].count}</p>

    <a href="/produtos">Produtos</a><br>
    <a href="/clientes">Clientes</a><br>
    <a href="/pedidos">Pedidos</a>
  `);
});

/* =========================
   PRODUTOS
========================= */

app.get("/produtos", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
    <h2>Produtos</h2>
    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome" required />
      <input name="preco" type="number" step="0.01" placeholder="Preço" required />
      <input name="estoque" type="number" placeholder="Estoque" required />
      <button>Salvar</button>
    </form>
    <hr>
    ${produtos.rows.map(p => `
      <p>${p.nome} - R$ ${p.preco} - Estoque: ${p.estoque}</p>
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

/* =========================
   CLIENTES
========================= */

app.get("/clientes", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(`
    <h2>Clientes</h2>
    <form method="POST" action="/clientes">
      <input name="nome" placeholder="Nome" required />
      <input name="telefone" placeholder="Telefone" />
      <input name="email" placeholder="Email" />
      <button>Salvar</button>
    </form>
    <hr>
    ${clientes.rows.map(c => `
      <p>${c.nome} - ${c.telefone || ""}</p>
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

/* =========================
   PEDIDOS
========================= */

app.get("/pedidos", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");
  const produtos = await pool.query("SELECT * FROM produtos");
  const pedidos = await pool.query(`
    SELECT p.id, c.nome AS cliente, pr.nome AS produto,
           p.quantidade, p.total, p.data
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.id
    JOIN produtos pr ON p.produto_id = pr.id
    ORDER BY p.id DESC
  `);

  res.send(`
    <h2>Novo Pedido</h2>
    <form method="POST" action="/pedidos">
      <select name="cliente_id" required>
        ${clientes.rows.map(c => `<option value="${c.id}">${c.nome}</option>`).join("")}
      </select>

      <select name="produto_id" required>
        ${produtos.rows.map(p => `<option value="${p.id}">${p.nome} (Estoque: ${p.estoque})</option>`).join("")}
      </select>

      <input type="number" name="quantidade" placeholder="Quantidade" required />
      <button>Gerar Pedido</button>
    </form>
    <hr>

    <h3>Lista de Pedidos</h3>
    ${pedidos.rows.map(p => `
      <p>
        Cliente: ${p.cliente} |
        Produto: ${p.produto} |
        Qtd: ${p.quantidade} |
        Total: R$ ${p.total} |
        Data: ${new Date(p.data).toLocaleString()}
      </p>
    `).join("")}

    <br><a href="/">Voltar</a>
  `);
});

app.post("/pedidos", async (req, res) => {
  const { cliente_id, produto_id, quantidade } = req.body;

  const produto = await pool.query(
    "SELECT * FROM produtos WHERE id = $1",
    [produto_id]
  );

  if (produto.rows.length === 0) {
    return res.send("Produto não encontrado");
  }

  if (produto.rows[0].estoque < quantidade) {
    return res.send("Estoque insuficiente");
  }

  const total = produto.rows[0].preco * quantidade;

  await pool.query(
    "INSERT INTO pedidos (cliente_id, produto_id, quantidade, total) VALUES ($1,$2,$3,$4)",
    [cliente_id, produto_id, quantidade, total]
  );

  await pool.query(
    "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
    [quantidade, produto_id]
  );

  res.redirect("/pedidos");
});

/* ========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));
