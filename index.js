const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =============================
// CONEXÃO BANCO
// =============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============================
// CRIAR TABELAS AUTOMATICAMENTE
// =============================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC NOT NULL,
      estoque INTEGER NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      total NUMERIC DEFAULT 0,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

criarTabelas();

// =============================
// DASHBOARD
// =============================
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
    <br/>
    <a href="/produtos">Produtos</a><br/>
    <a href="/clientes">Clientes</a><br/>
    <a href="/pedidos">Pedidos</a>
  `);
});

// =============================
// PRODUTOS
// =============================
app.get("/produtos", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  let lista = "";
  produtos.rows.forEach(p => {
    lista += `
      <div>
        ${p.nome} - R$ ${p.preco} - Estoque: ${p.estoque}
        <form method="POST" action="/produtos/excluir/${p.id}" style="display:inline;">
          <button type="submit">Excluir</button>
        </form>
      </div>
    `;
  });

  res.send(`
    <h1>Produtos</h1>
    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome" required />
      <input name="preco" placeholder="Preço" required />
      <input name="estoque" placeholder="Estoque" required />
      <button type="submit">Salvar</button>
    </form>
    <hr/>
    ${lista}
    <br/>
    <a href="/">Voltar</a>
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

app.post("/produtos/excluir/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
  res.redirect("/produtos");
});

// =============================
// CLIENTES
// =============================
app.get("/clientes", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  let lista = "";
  clientes.rows.forEach(c => {
    lista += `
      <div>
        ${c.nome} - ${c.telefone || ""} - ${c.email || ""}
        <form method="POST" action="/clientes/excluir/${c.id}" style="display:inline;">
          <button type="submit">Excluir</button>
        </form>
      </div>
    `;
  });

  res.send(`
    <h1>Clientes</h1>
    <form method="POST" action="/clientes">
      <input name="nome" placeholder="Nome" required />
      <input name="telefone" placeholder="Telefone" />
      <input name="email" placeholder="Email" />
      <button type="submit">Salvar</button>
    </form>
    <hr/>
    ${lista}
    <br/>
    <a href="/">Voltar</a>
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

app.post("/clientes/excluir/:id", async (req, res) => {
  await pool.query("DELETE FROM clientes WHERE id=$1", [req.params.id]);
  res.redirect("/clientes");
});

// =============================
// PEDIDOS
// =============================
app.get("/pedidos", async (req, res) => {
  const pedidos = await pool.query("SELECT * FROM pedidos ORDER BY id DESC");

  let lista = "";
  pedidos.rows.forEach(p => {
    lista += `
      <div>
        Pedido #${p.id} - Total: R$ ${p.total}
      </div>
    `;
  });

  res.send(`
    <h1>Pedidos</h1>
    ${lista}
    <br/>
    <a href="/">Voltar</a>
  `);
});

// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando 🚀"));
