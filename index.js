const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "erp-imperio-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ===============================
// CONEXÃO COM BANCO (RENDER)
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===============================
// CRIAR TABELAS AUTOMATICAMENTE
// ===============================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC NOT NULL,
      estoque INTEGER NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
  `);

  // Criar admin padrão se não existir
  const adminExiste = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1",
    ["admin"]
  );

  if (adminExiste.rows.length === 0) {
    const senhaHash = await bcrypt.hash("123456", 10);

    await pool.query(
      "INSERT INTO usuarios (nome, usuario, senha) VALUES ($1,$2,$3)",
      ["Administrador", "admin", senhaHash]
    );

    console.log("Admin padrão criado: usuário admin / senha 123456");
  }
}

criarTabelas();

// ===============================
// MIDDLEWARE PROTEÇÃO
// ===============================
function checkAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// ===============================
// LOGIN
// ===============================
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login - ERP Império</h2>
    <form method="POST">
      <input name="usuario" placeholder="Usuário" required />
      <input type="password" name="senha" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
  `);
});

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1",
    [usuario]
  );

  if (result.rows.length === 0) {
    return res.send("Usuário não encontrado");
  }

  const user = result.rows[0];

  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    return res.send("Senha incorreta");
  }

  req.session.user = user;
  res.redirect("/");
});

// ===============================
// LOGOUT
// ===============================
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ===============================
// DASHBOARD
// ===============================
app.get("/", checkAuth, async (req, res) => {
  const produtos = await pool.query("SELECT COUNT(*) FROM produtos");
  const clientes = await pool.query("SELECT COUNT(*) FROM clientes");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Usuário: ${req.session.user.nome}</p>
    <p>Produtos cadastrados: ${produtos.rows[0].count}</p>
    <p>Clientes cadastrados: ${clientes.rows[0].count}</p>
    <a href="/logout">Sair</a>
  `);
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
