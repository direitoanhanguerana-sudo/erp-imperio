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

// Dashboard
app.get("/", async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos ORDER BY id DESC");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>

    <h2>Cadastrar Produto</h2>
    <form method="POST" action="/produtos">
      <input name="nome" placeholder="Nome do Produto" required />
      <input name="preco" type="number" step="0.01" placeholder="Preço" required />
      <input name="estoque" type="number" placeholder="Estoque" required />
      <button type="submit">Salvar</button>
    </form>

    <h2>Lista de Produtos</h2>
    <table border="1" cellpadding="10">
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
            <form method="POST" action="/deletar/${p.id}" style="display:inline;">
              <button type="submit">Excluir</button>
            </form>
          </td>
        </tr>
      `).join("")}

    </table>
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

// Deletar produto
app.post("/deletar/:id", async (req, res) => {
  await pool.query("DELETE FROM produtos WHERE id = $1", [req.params.id]);
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
