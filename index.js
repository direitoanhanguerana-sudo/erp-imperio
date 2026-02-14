const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ==========================
// CONEXÃO COM BANCO
// ==========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ==========================
// ROTA PRINCIPAL (PAINEL)
// ==========================
app.get("/", async (req, res) => {
  try {
    const vendasHoje = await pool.query(
      "SELECT COALESCE(SUM(total),0) as total FROM pedidos WHERE DATE(criado_em) = CURRENT_DATE"
    );

    const vendasMes = await pool.query(
      "SELECT COALESCE(SUM(total),0) as total FROM pedidos WHERE DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)"
    );

    const totalPedidos = await pool.query(
      "SELECT COUNT(*) FROM pedidos"
    );

    const totalClientes = await pool.query(
      "SELECT COUNT(*) FROM clientes"
    );

    const estoqueBaixo = await pool.query(
      "SELECT COUNT(*) FROM produtos WHERE estoque < 10"
    );

    res.send(`
      <html>
      <head>
        <title>ERP Império Distribuidora</title>
        <style>
          body {
            font-family: Arial;
            background: #111;
            color: white;
            text-align: center;
          }
          h1 {
            margin-top: 30px;
          }
          .card {
            background: #1e1e1e;
            padding: 20px;
            margin: 20px;
            border-radius: 10px;
            display: inline-block;
            width: 250px;
          }
          .valor {
            font-size: 28px;
            font-weight: bold;
            margin-top: 10px;
            color: #00ff88;
          }
        </style>
      </head>
      <body>
        <h1>🚀 ERP Império Distribuidora</h1>

        <div class="card">
          <div>Vendas Hoje</div>
          <div class="valor">R$ ${vendasHoje.rows[0].total}</div>
        </div>

        <div class="card">
          <div>Vendas Mês</div>
          <div class="valor">R$ ${vendasMes.rows[0].total}</div>
        </div>

        <div class="card">
          <div>Total Pedidos</div>
          <div class="valor">${totalPedidos.rows[0].count}</div>
        </div>

        <div class="card">
          <div>Total Clientes</div>
          <div class="valor">${totalClientes.rows[0].count}</div>
        </div>

        <div class="card">
          <div>Produtos Estoque Baixo</div>
          <div class="valor">${estoqueBaixo.rows[0].count}</div>
        </div>

      </body>
      </html>
    `);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ==========================
// PRODUTOS
// ==========================
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
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

// ==========================
// CLIENTES
// ==========================
app.get("/clientes", async (req, res) => {
  const result = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
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

// ==========================
// PEDIDOS
// ==========================
app.post("/pedidos", async (req, res) => {
  const { cliente_id, itens } = req.body;

  let total = 0;

  for (const item of itens) {
    const produto = await pool.query(
      "SELECT * FROM produtos WHERE id = $1",
      [item.produto_id]
    );

    const preco = produto.rows[0].preco;
    total += preco * item.quantidade;

    await pool.query(
      "UPDATE produtos SET estoque = estoque - $1 WHERE id = $2",
      [item.quantidade, item.produto_id]
    );
  }

  const pedido = await pool.query(
    "INSERT INTO pedidos (cliente_id, total) VALUES ($1,$2) RETURNING *",
    [cliente_id, total]
  );

  res.json({
    mensagem: "Pedido criado com sucesso",
    pedido_id: pedido.rows[0].id,
    total,
  });
});

// ==========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando...");
});
