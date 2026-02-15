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

// Criar tabela automaticamente
async function criarTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      estoque INTEGER NOT NULL
    )
  `);
}
criarTabela();

// Página principal
app.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
  const produtos = result.rows;

  res.send(`
  <html>
  <head>
    <title>ERP Império Distribuidora</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f4f6f9;
        margin: 0;
        padding: 20px;
      }

      h1 {
        text-align: center;
      }

      .container {
        max-width: 900px;
        margin: auto;
      }

      .card {
        background: white;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      }

      input {
        padding: 8px;
        margin-right: 10px;
        margin-bottom: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
      }

      button {
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      }

      .btn-save {
        background: #28a745;
        color: white;
      }

      .btn-delete {
        background: #dc3545;
        color: white;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 10px;
        text-align: center;
      }

      th {
        background: #007bff;
        color: white;
      }

      tr:nth-child(even) {
        background: #f2f2f2;
      }

      @media(max-width: 600px){
        table {
          font-size: 12px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 ERP Império Distribuidora</h1>

      <div class="card">
        <h2>Cadastrar Produto</h2>
        <form method="POST" action="/produtos">
          <input name="nome" placeholder="Nome do Produto" required />
          <input name="preco" type="number" step="0.01" placeholder="Preço" required />
          <input name="estoque" type="number" placeholder="Estoque" required />
          <button class="btn-save" type="submit">Salvar</button>
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
          ${produtos.map(p => `
            <tr>
              <td>${p.id}</td>
              <td>${p.nome}</td>
              <td>R$ ${p.preco}</td>
              <td>${p.estoque}</td>
              <td>
                <form method="POST" action="/deletar/${p.id}">
                  <button class="btn-delete">Excluir</button>
                </form>
              </td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  </body>
  </html>
  `);
});

// Criar produto
app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;

  await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1, $2, $3)",
    [nome, preco, estoque]
  );

  res.redirect("/");
});

// Excluir produto
app.post("/deletar/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));
