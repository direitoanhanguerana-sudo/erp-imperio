const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========================
// DASHBOARD
// ========================
app.get("/", async (req, res) => {
  try {
    const vendas = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM pedidos");
    const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
    const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const estoqueBaixo = await pool.query("SELECT COUNT(*) FROM produtos WHERE estoque < 5");

    res.send(`
    <html>
    <head>
      <title>ERP Império</title>
      <style>
        body { font-family: Arial; background:#f4f6f9; text-align:center; margin:0; }
        h1 { margin-top:30px; }
        .cards { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-top:40px; }
        .card {
          background:white;
          padding:25px;
          width:220px;
          border-radius:12px;
          box-shadow:0 4px 12px rgba(0,0,0,0.1);
        }
        .valor { font-size:22px; color:#27ae60; margin-top:10px; }
        .btn {
          margin:20px 10px;
          padding:12px 25px;
          background:#2980b9;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          text-decoration:none;
        }
      </style>
    </head>
    <body>
      <h1>🚀 ERP Império Distribuidora</h1>

      <div class="cards">
        <div class="card">
          <div>Vendas Totais</div>
          <div class="valor">R$ ${vendas.rows[0].total}</div>
        </div>
        <div class="card">
          <div>Total Pedidos</div>
          <div class="valor">${pedidos.rows[0].count}</div>
        </div>
        <div class="card">
          <div>Total Clientes</div>
          <div class="valor">${clientes.rows[0].count}</div>
        </div>
        <div class="card">
          <div>Estoque Baixo</div>
          <div class="valor">${estoqueBaixo.rows[0].count}</div>
        </div>
      </div>

      <a class="btn" href="/produtos">Produtos</a>
      <a class="btn" href="/clientes">Clientes</a>
      <a class="btn" href="/pedidos-view">Pedidos</a>

    </body>
    </html>
    `);
  } catch (err) {
    res.send("Erro no dashboard");
  }
});

// ========================
// PEDIDOS VIEW PROFISSIONAL
// ========================
app.get("/pedidos-view", async (req, res) => {
  const pedidos = await pool.query(`
    SELECT p.id, p.total, p.criado_em, c.nome as cliente
    FROM pedidos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.id DESC
  `);

  let linhas = pedidos.rows.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.cliente || "-"}</td>
      <td>R$ ${p.total}</td>
      <td>${new Date(p.criado_em).toLocaleDateString()}</td>
    </tr>
  `).join("");

  res.send(`
  <html>
  <head>
    <style>
      body { font-family:Arial; background:#f4f6f9; padding:30px; }
      h2 { text-align:center; }
      table {
        width:100%;
        background:white;
        border-radius:10px;
        box-shadow:0 4px 10px rgba(0,0,0,0.1);
        border-collapse:collapse;
      }
      th, td {
        padding:12px;
        border-bottom:1px solid #eee;
        text-align:center;
      }
      th { background:#2980b9; color:white; }
      .voltar {
        margin-top:20px;
        display:inline-block;
        padding:10px 20px;
        background:#27ae60;
        color:white;
        border-radius:6px;
        text-decoration:none;
      }
    </style>
  </head>
  <body>

    <h2>📦 Lista de Pedidos</h2>

    <table>
      <tr>
        <th>ID</th>
        <th>Cliente</th>
        <th>Total</th>
        <th>Data</th>
      </tr>
      ${linhas}
    </table>

    <br>
    <a class="voltar" href="/">← Voltar</a>

  </body>
  </html>
  `);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor rodando..."));
