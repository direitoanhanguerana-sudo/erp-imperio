const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Criar tabelas automaticamente
async function criarTabelas() {
  try {
    // Produtos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        estoque INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Clientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        telefone VARCHAR(20),
        email VARCHAR(100),
        endereco TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas verificadas/criadas com sucesso.");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

// Rota principal
app.get("/", (req, res) => {
  res.send("ERP Império Distribuidora Online 🚀");
});


// =====================
// PRODUTOS
// =====================

app.get("/produtos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produtos ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO produtos (nome, preco, estoque) VALUES ($1, $2, $3) RETURNING *",
      [nome, preco, estoque]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao cadastrar produto" });
  }
});


// =====================
// CLIENTES
// =====================

// Listar clientes
app.get("/clientes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar clientes" });
  }
});

// Criar cliente
app.post("/clientes", async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO clientes (nome, telefone, email, endereco) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, telefone, email, endereco]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});


const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  console.log("Servidor rodando...");
  await criarTabelas();
});
