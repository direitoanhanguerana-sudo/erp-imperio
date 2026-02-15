const express = require("express");
const { Pool } = require("pg");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "imperio_erp_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// ============================
// CONEXÃO BANCO
// ============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ============================
// CRIAR TABELAS
// ============================

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    );
  `);

  // Cria usuário padrão se não existir
  await pool.query(`
    INSERT INTO usuarios (usuario, senha)
    VALUES ('admin', '1234')
    ON CONFLICT (usuario) DO NOTHING;
  `);
}

criarTabelas();

// ============================
// MIDDLEWARE DE PROTEÇÃO
// ============================

function verificarLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }
  next();
}

// ============================
// ROTAS
// ============================

app.get("/login", (req, res) => {
  res.send(`
    <h2>Login ERP Império</h2>
    <form method="POST" action="/login">
      <input name="usuario" placeholder="Usuário" required />
      <input name="senha" type="password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
  `);
});

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1 AND senha = $2",
    [usuario, senha]
  );

  if (result.rows.length > 0) {
    req.session.usuario = usuario;
    return res.redirect("/");
  }

  res.send("Usuário ou senha inválidos");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ============================
// DASHBOARD PROTEGIDO
// ============================

app.get("/", verificarLogin, (req, res) => {
  res.send(`
    <h1>ERP Império Distribuidora</h1>
    <p>Bem-vindo, ${req.session.usuario}</p>
    <a href="/logout">Sair</a>
  `);
});

// ============================
// START SERVIDOR
// ============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
