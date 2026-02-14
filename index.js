const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONEXÃO BANCO =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== CRIAR TABELAS =====
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
      total NUMERIC(10,2),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      preco_unitario NUMERIC(10,2)
    );
  `);

  console.log("Tabelas verificadas/criadas.");
}

// =====================
// ===== PRODUTOS =====
// =====================

app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id");
  res.json(result.rows);
});

app.post("/produtos", async (req, res) => {
  const { nome, preco, estoque } = req.body;
  const result = await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3) RETURNING *",
    [nome, preco, estoque]
  );
  res.json(result.rows[0]);
});

// =====================
// ===== CLIENTES =====
// =====================

app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id");
  res.json(result.rows);
});

app.post("/clientes", async (req, res) => {
  const { nome, telefone, email, endereco } = req.body;
  const result = await pool.query(
    "INSERT INTO clientes (nome, telefone, email, endereco) VALUES ($1,$2,$3,$4) RETURNING *",
    [nome, telefone, email, endereco]
  );
  res.json(result.rows[0]);
});

// =====================
// ===== PEDIDOS =====
// =====================

app.post("/pedidos", async (req, res) => {
  const { cliente_id, itens } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;

    for (let item of itens) {
      const produto = await client.query(
        "SELECT * FROM produtos WHERE id = $1",
        [item.produto_id]
      );

      if (produto.rows.length === 0) {
        throw new Error("Produto não encontrado");
      }

      const preco = parseFloat(produto.rows[0].preco);
      const subtotal = preco * item.quantidade;
      total += subtotal;

      if (produto.rows[0].estoque < item.quantidade) {
        throw new Error("Estoque insuficiente");
      }

      await client.query(
        "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
        [item.quantidade, item.produto_id]
      );
    }

    const pedido = await client.query(
      "INSERT INTO pedidos (cliente_id, total) VALUES ($1,$2) RETURNING *",
      [cliente_id, total]
    );

    for (let item of itens) {
      const produto = await client.query(
        "SELECT preco FROM produtos WHERE id = $1",
        [item.produto_id]
      );

      await client.query(
        "INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES ($1,$2,$3,$4)",
        [pedido.rows[0].id, item.produto_id, item.quantidade, produto.rows[0].preco]
      );
    }

    await client.query("COMMIT");

    res.json({
      mensagem: "Pedido criado com sucesso",
      pedido_id: pedido.rows[0].id,
      total
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
});

// =====================
// ===== DASHBOARD =====
// =====================

app.get("/dashboard", async (req, res) => {

  const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");
  const totalPedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
  const totalClientes = await pool.query("SELECT COUNT(*) FROM clientes");
  const estoqueBaixo = await pool.query("SELECT COUNT(*) FROM produtos WHERE estoque <= 5");

  res.json({
    vendas_totais: parseFloat(vendas.rows[0].coalesce),
    total_pedidos: parseInt(totalPedidos.rows[0].count),
    total_clientes: parseInt(totalClientes.rows[0].count),
    produtos_estoque_baixo: parseInt(estoqueBaixo.rows[0].count)
  });
});

// =====================

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  await criarTabelas();
  console.log("🚀 ERP Império rodando...");
});
