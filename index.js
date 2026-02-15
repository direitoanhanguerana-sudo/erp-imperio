const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// conexão banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// testar conexão
pool.connect()
  .then(() => console.log("Banco conectado ✅"))
  .catch(err => console.error("Erro banco ❌", err));

// ROTA PRINCIPAL
app.get("/", async (req, res) => {
  try {
    const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
    const clientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const pedidos = await pool.query("SELECT COUNT(*) FROM pedidos");

    const vendas = await pool.query("SELECT COALESCE(SUM(total),0) as total FROM pedidos");

    res.send(`
      <h1>🚀 ERP Império Distribuidora</h1>
      <p>Produtos: ${produtos.rows[0].count}</p>
      <p>Clientes: ${clientes.rows[0].count}</p>
      <p>Pedidos: ${pedidos.rows[0].count}</p>
      <p>Vendas Totais: R$ ${vendas.rows[0].total}</p>
      <br>
      <a href="/produtos">Produtos</a><br>
      <a href="/clientes">Clientes</a><br>
      <a href="/pedidos">Pedidos</a>
    `);
  } catch (err) {
    res.send("Erro na rota principal");
  }
});

// ROTA TESTE
app.get("/teste", (req, res) => {
  res.send("Servidor funcionando ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando 🚀"));
