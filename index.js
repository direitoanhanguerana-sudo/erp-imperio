const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Criar tabelas automaticamente
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        telefone VARCHAR(20),
        email VARCHAR(150),
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
        preco_unitario NUMERIC(10,2),
        subtotal NUMERIC(10,2)
      );
    `);

    console.log("Tabelas criadas/verificadas com sucesso.");

  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

app.get("/", (req, res) => {
  res.send("ERP Império Distribuidora Online 🚀");
});

/* =========================
   PRODUTOS
========================= */

app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id ASC");
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

/* =========================
   CLIENTES
========================= */

app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id ASC");
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

/* =========================
   PEDIDOS
========================= */

app.post("/pedidos", async (req, res) => {

  const { cliente_id, itens } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;

    const pedidoResult = await client.query(
      "INSERT INTO pedidos (cliente_id, total) VALUES ($1, $2) RETURNING *",
      [cliente_id, 0]
    );

    const pedido = pedidoResult.rows[0];

    for (const item of itens) {

      const produtoResult = await client.query(
        "SELECT * FROM produtos WHERE id = $1",
        [item.produto_id]
      );

      const produto = produtoResult.rows[0];

      if (!produto) throw new Error("Produto não encontrado");

      if (produto.estoque < item.quantidade)
        throw new Error("Estoque insuficiente");

      const subtotal = produto.preco * item.quantidade;
      total += subtotal;

      await client.query(
        `INSERT INTO itens_pedido 
         (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [pedido.id, produto.id, item.quantidade, produto.preco, subtotal]
      );

      await client.query(
        "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
        [item.quantidade, produto.id]
      );
    }

    await client.query(
      "UPDATE pedidos SET total = $1 WHERE id = $2",
      [total, pedido.id]
    );

    await client.query("COMMIT");

    res.json({ mensagem: "Pedido criado com sucesso", pedido_id: pedido.id, total });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
});

app.get("/pedidos", async (req, res) => {

  const pedidos = await pool.query("SELECT * FROM pedidos ORDER BY id DESC");

  res.json(pedidos.rows);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  console.log("Servidor rodando...");
  await criarTabelas();
});
