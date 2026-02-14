const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        estoque INTEGER NOT NULL DEFAULT 0
      );
    `);

    console.log("Tabela produtos pronta.");
  } catch (err) {
    console.error("Erro ao criar tabela:", err);
  }
}

app.get("/", (req, res) => {
  res.send("ERP Império Distribuidora Online 🚀");
});

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

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  console.log("Servidor rodando...");
  await criarTabelas();
});
