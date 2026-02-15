const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

/* ===============================
   🔐 MIDDLEWARE DE AUTENTICAÇÃO
================================= */

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ erro: "Token inválido" });
    req.user = user;
    next();
  });
}

/* ===============================
   👤 LOGIN
================================= */

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario !== "admin" || senha !== "123456") {
    return res.status(401).json({ erro: "Usuário ou senha inválidos" });
  }

  const token = jwt.sign({ usuario }, JWT_SECRET, {
    expiresIn: "8h"
  });

  res.json({ token });
});

/* ===============================
   📊 DASHBOARD PROTEGIDO
================================= */

app.get("/dashboard", autenticarToken, async (req, res) => {
  try {
    const vendas = await pool.query("SELECT SUM(total) FROM pedidos");
    const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
    const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const estoqueBaixo = await pool.query(
      "SELECT COUNT(*) FROM produtos WHERE estoque < 5"
    );

    res.json({
      vendas_totais: vendas.rows[0].sum || 0,
      total_pedidos: pedidos.rows[0].count,
      total_clientes: clientes.rows[0].count,
      produtos_estoque_baixo: estoqueBaixo.rows[0].count
    });

  } catch (err) {
    res.status(500).json({ erro: "Erro ao carregar dashboard" });
  }
});

/* ===============================
   🚀 SERVIDOR
================================= */

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
