const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Conexão banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Criar tabelas
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      preco NUMERIC(10,2) NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20),
      email VARCHAR(100),
      endereco VARCHAR(200),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      total NUMERIC(10,2) NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedido_itens (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id),
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      preco_unitario NUMERIC(10,2) NOT NULL
    );
  `);

  console.log("Tabelas verificadas.");
}

app.get("/", (req, res) => {
  res.send("ERP Império Distribuidora Online 🚀");
});


// =====================
// DASHBOARD
// =====================

app.get("/dashboard", async (req, res) => {
  try {

    const vendasHoje = await pool.query(`
      SELECT COALESCE(SUM(total),0) AS total
      FROM pedidos
      WHERE DATE(criado_em) = CURRENT_DATE
    `);

    const vendasMes = await pool.query(`
      SELECT COALESCE(SUM(total),0) AS total
      FROM pedidos
      WHERE DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const totalPedidos = await pool.query(`
      SELECT COUNT(*) FROM pedidos
    `);

    const totalClientes = await pool.query(`
      SELECT COUNT(*) FROM clientes
    `);

    const estoqueBaixo = await pool.query(`
      SELECT COUNT(*) FROM produtos
      WHERE estoque <= 5
    `);

    res.json({
      vendas_hoje: Number(vendasHoje.rows[0].total),
      vendas_mes: Number(vendasMes.rows[0].total),
      total_pedidos: Number(totalPedidos.rows[0].count),
      total_clientes: Number(totalClientes.rows[0].count),
      produtos_estoque_baixo: Number(estoqueBaixo.rows[0].count)
    });

  } catch (error) {
    res.status(500).json({ erro: "Erro ao gerar dashboard" });
  }
});


// =====================
// INICIAR SERVIDOR
// =====================

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  await criarTabelas();
  console.log("Servidor rodando...");
});
