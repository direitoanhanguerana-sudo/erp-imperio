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


// ==========================
// CRIAR TABELAS AUTOMATICAMENTE
// ==========================
async function criar() {
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

criar();


// ==========================
// DASHBOARD
// ==========================
app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
  const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");

  res.send(`
  <h1>🚀 ERP Império Distribuidora</h1>
  <p><strong>Produtos:</strong> ${produtos.rows[0].count}</p>
  <p><strong>Clientes:</strong> ${clientes.rows[0].count}</p>
  <p><strong>Pedidos:</strong> ${pedidos.rows[0].count}</p>
  <p><strong>Vendas Totais:</strong> R$ ${vendas.rows[0].coalesce}</p>
  <br>
  <a href="/produtos">Produtos</a><br>
  <a href="/clientes">Clientes</a><br>
  <a href="/pedidos">Pedidos</a>
  `);
});


// ==========================
// PRODUTOS
// ==========================
app.get("/produtos", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
  <h2>Cadastrar Produto</h2>
  <form method="POST">
    <input name="nome" placeholder="Nome" required />
    <input name="preco" type="number" step="0.01" placeholder="Preço" required />
    <input name="estoque" type="number" placeholder="Estoque" required />
    <button>Salvar</button>
  </form>

  <h2>Lista</h2>
  ${produtos.rows.map(p => `
    <p>
      ${p.nome} | R$ ${p.preco} | Estoque: ${p.estoque}
      <form method="POST" action="/produtos/delete/${p.id}" style="display:inline">
        <button>Excluir</button>
      </form>
    </p>
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

app.post("/produtos/delete/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
  res.redirect("/produtos");
});


// ==========================
// CLIENTES
// ==========================
app.get("/clientes", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(`
  <h2>Cadastrar Cliente</h2>
  <form method="POST">
    <input name="nome" placeholder="Nome" required />
    <input name="telefone" placeholder="Telefone" />
    <input name="email" placeholder="Email" />
    <button>Salvar</button>
  </form>

  <h2>Lista</h2>
  ${clientes.rows.map(c => `
    <p>
      ${c.nome} | ${c.telefone || ""} | ${c.email || ""}
      <form method="POST" action="/clientes/delete/${c.id}" style="display:inline">
        <button>Excluir</button>
      </form>
    </p>
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

app.post("/clientes/delete/:id", async (req, res) => {
  await pool.query("DELETE FROM clientes WHERE id=$1", [req.params.id]);
  res.redirect("/clientes");
});


// ==========================
// PEDIDOS
// ==========================
app.get("/pedidos", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");
  const produtos = await pool.query("SELECT * FROM produtos");
  const pedidos = await pool.query(`
    SELECT p.*, c.nome as cliente, pr.nome as produto
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.id
    JOIN produtos pr ON p.produto_id = pr.id
    ORDER BY p.id DESC
  `);

  res.send(`
  <h2>Novo Pedido</h2>
  <form method="POST">
    <select name="cliente_id" required>
      <option value="">Cliente</option>
      ${clientes.rows.map(c => `<option value="${c.id}">${c.nome}</option>`).join("")}
    </select>

    <select name="produto_id" required>
      <option value="">Produto</option>
      ${produtos.rows.map(p => `<option value="${p.id}">${p.nome} (Estoque: ${p.estoque})</option>`).join("")}
    </select>

    <input name="quantidade" type="number" placeholder="Quantidade" required />
    <button>Salvar</button>
  </form>

  <h2>Lista</h2>
  ${pedidos.rows.map(p => `
    <p>
      Cliente: ${p.cliente} |
      Produto: ${p.produto} |
      Qtd: ${p.quantidade} |
      Total: R$ ${p.total}
    </p>
  `).join("")}

  <br><a href="/">Voltar</a>
  `);
});

app.post("/pedidos", async (req, res) => {
  const { cliente_id, produto_id, quantidade } = req.body;

  const produto = await pool.query(
    "SELECT * FROM produtos WHERE id=$1",
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
    "UPDATE produtos SET estoque = estoque - $1 WHERE id=$2",
    [quantidade, produto_id]
  );

  res.redirect("/pedidos");
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
