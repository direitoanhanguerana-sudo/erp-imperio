const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
}

criarTabelas();


// ======================
// PÁGINA INICIAL
// ======================
app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Produtos: ${produtos.rows[0].count}</p>
    <p>Clientes: ${clientes.rows[0].count}</p>

    <a href="/produtos">Produtos</a><br/>
    <a href="/clientes">Clientes</a>
  `);
});


// ======================
// PRODUTOS
// ======================
app.get("/produtos", async (req, res) => {
  const lista = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
    <h2>Produtos</h2>

    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome" required />
      <input name="preco" type="number" step="0.01" placeholder="Preço" required />
      <input name="estoque" type="number" placeholder="Estoque" required />
      <button type="submit">Salvar</button>
    </form>

    <hr/>

    ${lista.rows.map(p => `
      <p>
        ${p.nome} - R$ ${p.preco} - Estoque: ${p.estoque}
        <form method="POST" action="/produtos/deletar/${p.id}" style="display:inline;">
          <button type="submit">Excluir</button>
        </form>
      </p>
    `).join("")}

    <br/><a href="/">Voltar</a>
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


// ======================
// CLIENTES
// ======================
app.get("/clientes", async (req, res) => {
  const lista = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(`
    <h2>Clientes</h2>

    <form method="POST" action="/clientes">
      <input name="nome" placeholder="Nome" required />
      <input name="telefone" placeholder="Telefone" />
      <input name="email" placeholder="Email" />
      <button type="submit">Salvar</button>
    </form>

    <hr/>

    ${lista.rows.map(c => `
      <p>
        ${c.nome} - ${c.telefone || ""} - ${c.email || ""}
        <form method="POST" action="/clientes/deletar/${c.id}" style="display:inline;">
          <button type="submit">Excluir</button>
        </form>
      </p>
    `).join("")}

    <br/><a href="/">Voltar</a>
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


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Servidor rodando 🚀");
});
