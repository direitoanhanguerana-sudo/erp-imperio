const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= CRIAR TABELAS =================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      estoque INTEGER NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20),
      email VARCHAR(100)
    )
  `);
}

criarTabelas();

// ================= ESTILO GLOBAL =================
function layout(titulo, conteudo) {
  return `
  <html>
  <head>
    <title>${titulo}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        font-family: Arial;
        background: #f4f6f9;
        padding: 20px;
      }
      h1 {
        text-align: center;
      }
      .card {
        background: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 30px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      input {
        padding: 10px;
        margin: 5px 0;
        width: 100%;
        border-radius: 6px;
        border: 1px solid #ccc;
      }
      button {
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }
      .btn-green { background: #28a745; color: white; }
      .btn-red { background: #dc3545; color: white; }
      .btn-blue { background: #007bff; color: white; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background: #007bff;
        color: white;
        padding: 10px;
      }
      td {
        padding: 10px;
        text-align: center;
      }
      tr:nth-child(even) {
        background: #f2f2f2;
      }
      .menu {
        text-align: center;
        margin-bottom: 20px;
      }
      .menu a {
        margin: 0 10px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h1>🚀 ERP Império Distribuidora</h1>
    <div class="menu">
      <a href="/"><button class="btn-blue">Produtos</button></a>
      <a href="/clientes"><button class="btn-blue">Clientes</button></a>
    </div>
    ${conteudo}
  </body>
  </html>
  `;
}

// ================= PRODUTOS =================
app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(layout("Produtos", `
    <div class="card">
      <h2>Cadastrar Produto</h2>
      <form method="POST" action="/produtos">
        <input name="nome" placeholder="Nome do Produto" required/>
        <input name="preco" type="number" step="0.01" placeholder="Preço" required/>
        <input name="estoque" type="number" placeholder="Estoque" required/>
        <button class="btn-green">Salvar</button>
      </form>
    </div>

    <div class="card">
      <h2>Lista de Produtos</h2>
      <table>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Preço</th>
          <th>Estoque</th>
          <th>Ações</th>
        </tr>
        ${produtos.rows.map(p => `
          <tr>
            <td>${p.id}</td>
            <td>${p.nome}</td>
            <td>R$ ${p.preco}</td>
            <td>${p.estoque}</td>
            <td>
              <form method="POST" action="/deletar-produto/${p.id}">
                <button class="btn-red">Excluir</button>
              </form>
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  `));
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1, $2, $3)",
    [nome, preco, estoque]
  );
  res.redirect("/");
});

app.post("/deletar-produto/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
  res.redirect("/");
});

// ================= CLIENTES =================
app.get("/clientes", async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes ORDER BY id DESC");

  res.send(layout("Clientes", `
    <div class="card">
      <h2>Cadastrar Cliente</h2>
      <form method="POST" action="/clientes">
        <input name="nome" placeholder="Nome do Cliente" required/>
        <input name="telefone" placeholder="Telefone"/>
        <input name="email" placeholder="Email"/>
        <button class="btn-green">Salvar</button>
      </form>
    </div>

    <div class="card">
      <h2>Lista de Clientes</h2>
      <table>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Email</th>
          <th>Ações</th>
        </tr>
        ${clientes.rows.map(c => `
          <tr>
            <td>${c.id}</td>
            <td>${c.nome}</td>
            <td>${c.telefone || "-"}</td>
            <td>${c.email || "-"}</td>
            <td>
              <form method="POST" action="/deletar-cliente/${c.id}">
                <button class="btn-red">Excluir</button>
              </form>
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  `));
});

app.post("/clientes", async (req, res) => {
  const { nome, telefone, email } = req.body;
  await pool.query(
    "INSERT INTO clientes (nome, telefone, email) VALUES ($1, $2, $3)",
    [nome, telefone, email]
  );
  res.redirect("/clientes");
});

app.post("/deletar-cliente/:id", async (req, res) => {
  await pool.query("DELETE FROM clientes WHERE id = $1", [req.params.id]);
  res.redirect("/clientes");
});

// ================= SERVIDOR =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
