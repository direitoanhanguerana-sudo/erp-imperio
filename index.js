const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ===========================
   CONEXÃO COM BANCO RENDER
=========================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===========================
   CRIAR TABELAS AUTOMATICAMENTE
=========================== */

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
      total NUMERIC(10,2) NOT NULL
    );
  `);

  console.log("Tabelas verificadas/criadas.");
}

criarTabelas();

/* ===========================
   DASHBOARD
=========================== */

app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>

    <p><strong>Produtos:</strong> ${produtos.rows[0].count}</p>
    <p><strong>Clientes:</strong> ${clientes.rows[0].count}</p>
    <p><strong>Pedidos:</strong> ${pedidos.rows[0].count}</p>

    <hr>
    <a href="/produtos">Produtos</a><br>
    <a href="/clientes">Clientes</a><br>
    <a href="/pedidos">Pedidos</a>
  `);
});

/* ===========================
   PRODUTOS
=========================== */

app.get("/produtos", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
    <h2>Produtos</h2>
    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome" required>
      <input name="preco" type="number" step="0.01" placeholder="Preço" required>
      <input name="estoque" type="number" placeholder="Estoque" required>
      <button type="submit">Salvar</button>
    </form>
    <hr>
    ${produtos.rows
      .map(
        (p) => `
        <p>
          ${p.nome} - R$ ${p.preco} - Estoque: ${p.estoque}
          <form method="POST" action="/produtos/deletar/${p.id}" style="display:inline;">
            <button type="submit">Excluir</button>
          </form>
        </p>
      `
      )
      .join("")}
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

app.post("/produtos/deletar/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
  res.redirect("/produtos");
});

/* ===========================
   CLIENTES
=========================== */

app.get("/clientes", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(`
    <h2>Clientes</h2>
    <form method="POST" action="/clientes">
      <input name="nome" placeholder="Nome" required>
      <input name="telefone" placeholder="Telefone">
      <input name="email" placeholder="Email">
      <button type="submit">Salvar</button>
    </form>
    <hr>
    ${clientes.rows
      .map(
        (c) => `
        <p>
          ${c.nome} - ${c.telefone || ""} - ${c.email || ""}
          <form method="POST" action="/clientes/deletar/${c.id}" style="display:inline;">
            <button type="submit">Excluir</button>
          </form>
        </p>
      `
      )
      .join("")}
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

app.post("/clientes/deletar/:id", async (req, res) => {
  await pool.query("DELETE FROM clientes WHERE id=$1", [req.params.id]);
  res.redirect("/clientes");
});

/* ===========================
   PEDIDOS
=========================== */

app.get("/pedidos", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");
  const produtos = await pool.query("SELECT * FROM produtos");
  const pedidos = await pool.query(`
    SELECT pedidos.*, clientes.nome AS cliente, produtos.nome AS produto
    FROM pedidos
    LEFT JOIN clientes ON pedidos.cliente_id = clientes.id
    LEFT JOIN produtos ON pedidos.produto_id = produtos.id
    ORDER BY pedidos.id DESC
  `);

  res.send(`
    <h2>Pedidos</h2>
    <form method="POST" action="/pedidos">
      <select name="cliente_id" required>
        ${clientes.rows
          .map((c) => `<option value="${c.id}">${c.nome}</option>`)
          .join("")}
      </select>

      <select name="produto_id" required>
        ${produtos.rows
          .map((p) => `<option value="${p.id}">${p.nome}</option>`)
          .join("")}
      </select>

      <input name="quantidade" type="number" placeholder="Qtd" required>
      <button type="submit">Salvar</button>
    </form>
    <hr>
    ${pedidos.rows
      .map(
        (p) => `
        <p>
          Cliente: ${p.cliente} | Produto: ${p.produto} |
          Qtd: ${p.quantidade} | Total: R$ ${p.total}
        </p>
      `
      )
      .join("")}
    <br><a href="/">Voltar</a>
  `);
});

app.post("/pedidos", async (req, res) => {
  const { cliente_id, produto_id, quantidade } = req.body;

  const produto = await pool.query(
    "SELECT preco FROM produtos WHERE id=$1",
    [produto_id]
  );

  const preco = produto.rows[0].preco;
  const total = preco * quantidade;

  await pool.query(
    "INSERT INTO pedidos (cliente_id, produto_id, quantidade, total) VALUES ($1,$2,$3,$4)",
    [cliente_id, produto_id, quantidade, total]
  );

  res.redirect("/pedidos");
});

/* ===========================
   SERVIDOR
=========================== */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor rodando 🚀"));
