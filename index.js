const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_forte";

// =============================
// CRIAR TABELAS AUTOMATICAMENTE
// =============================
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        telefone VARCHAR(20),
        email VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        preco NUMERIC,
        estoque INTEGER
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        total NUMERIC,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas verificadas/criadas com sucesso");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

criarTabelas();

// =============================
// MIDDLEWARE JWT
// =============================
function verificarToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    jwt.verify(token.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Token inválido" });
  }
}

// =============================
// LOGIN SIMPLES
// =============================
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario === "admin" && senha === "1234") {
    const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Credenciais inválidas" });
});

// =============================
// DASHBOARD
// =============================
app.get("/dashboard", verificarToken, async (req, res) => {
  try {
    const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");
    const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
    const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const estoqueBaixo = await pool.query("SELECT COUNT(*) FROM produtos WHERE estoque < 5");

    res.json({
      vendas_totais: vendas.rows[0].coalesce,
      total_pedidos: pedidos.rows[0].count,
      total_clientes: clientes.rows[0].count,
      produtos_estoque_baixo: estoqueBaixo.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: "Erro no dashboard" });
  }
});

// =============================
// PÁGINA INICIAL (ERP VISUAL)
// =============================
app.get("/", async (req, res) => {
  try {
    const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");
    const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
    const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const estoqueBaixo = await pool.query("SELECT COUNT(*) FROM produtos WHERE estoque < 5");

    res.send(`
      <html>
      <head>
        <title>ERP Império Distribuidora</title>
        <style>
          body { font-family: Arial; background:#ffffff; text-align:center; }
          h1 { margin-top:30px; }
          .card {
            display:inline-block;
            margin:15px;
            padding:20px;
            border-radius:10px;
            box-shadow:0 0 10px rgba(0,0,0,0.1);
            width:200px;
          }
          .valor { font-size:20px; color:#2e7d32; margin-top:10px; }
        </style>
      </head>
      <body>
        <h1>🚀 ERP Império Distribuidora</h1>

        <div class="card">
          <div>Vendas Totais</div>
          <div class="valor">R$ ${vendas.rows[0].coalesce}</div>
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

      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Erro ao carregar ERP");
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
