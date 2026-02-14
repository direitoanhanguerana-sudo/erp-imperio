const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão
app.use(session({
  secret: "imperio_super_secreto",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Criar tabelas
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(50) UNIQUE NOT NULL,
      senha TEXT NOT NULL
    );
  `);

  // Criar admin padrão se não existir
  const admin = await pool.query("SELECT * FROM usuarios WHERE usuario = 'admin'");
  if (admin.rows.length === 0) {
    const senhaHash = await bcrypt.hash("123456", 10);
    await pool.query(
      "INSERT INTO usuarios (usuario, senha) VALUES ($1, $2)",
      ["admin", senhaHash]
    );
    console.log("Usuário admin criado.");
  }
}

// Middleware proteção
function verificarLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }
  next();
}

// Tela Login
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Login ERP Império</title>
      <style>
        body { font-family: Arial; background:#f4f6f9; display:flex; justify-content:center; align-items:center; height:100vh; }
        .box { background:white; padding:30px; border-radius:10px; box-shadow:0 5px 15px rgba(0,0,0,0.1); }
        input { display:block; width:250px; margin:10px 0; padding:8px; }
        button { background:#0d6efd; color:white; border:none; padding:10px; width:100%; cursor:pointer; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🔐 ERP Império</h2>
        <form method="POST" action="/login">
          <input name="usuario" placeholder="Usuário" required />
          <input name="senha" type="password" placeholder="Senha" required />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Processar Login
app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  const result = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1",
    [usuario]
  );

  if (result.rows.length === 0) {
    return res.send("Usuário não encontrado");
  }

  const usuarioBanco = result.rows[0];
  const senhaValida = await bcrypt.compare(senha, usuarioBanco.senha);

  if (!senhaValida) {
    return res.send("Senha incorreta");
  }

  req.session.usuario = usuarioBanco.usuario;
  res.redirect("/");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Dashboard protegido
app.get("/", verificarLogin, (req, res) => {
  res.send(`
    <html>
    <body style="font-family:Arial;background:#f4f6f9;text-align:center;padding-top:100px;">
      <h1>🚀 ERP Império Distribuidora</h1>
      <p>Bem-vindo, ${req.session.usuario}</p>
      <br>
      <a href="/logout">Sair</a>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  await criarTabelas();
  console.log("Servidor rodando...");
});
