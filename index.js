const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* =========================
   SESSÃO (LOGIN REAL)
========================= */
app.use(
  session({
    secret: "imperio-erp-secreto",
    resave: false,
    saveUninitialized: false,
  })
);

/* =========================
   CONEXÃO BANCO
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   CRIAR TABELAS
========================= */
async function criarTabelas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario TEXT UNIQUE,
        senha TEXT,
        nivel TEXT
      );
    `);

    await pool.query(`
      INSERT INTO usuarios (usuario, senha, nivel)
      SELECT 'admin', '123456', 'admin'
      WHERE NOT EXISTS (
        SELECT 1 FROM usuarios WHERE usuario = 'admin'
      );
    `);

    console.log("Banco pronto ✅");
  } catch (err) {
    console.error(err);
  }
}
criarTabelas();

/* =========================
   MIDDLEWARE DE PROTEÇÃO
========================= */
function verificarLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/");
  }
  next();
}

/* =========================
   ROTAS
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1 AND senha = $2",
      [usuario, senha]
    );

    if (result.rows.length > 0) {
      req.session.usuario = usuario;
      res.redirect("/dashboard");
    } else {
      res.send("Usuário ou senha inválidos");
    }
  } catch (err) {
    console.error(err);
    res.send("Erro no login");
  }
});

app.get("/dashboard", verificarLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* =========================
   PORTA
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando 🚀");
});
