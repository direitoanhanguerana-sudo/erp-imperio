const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "imperio_erp_secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============================
// CRIAR TABELAS
// =============================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    );
  `);

  const existe = await pool.query(
    "SELECT * FROM usuarios WHERE usuario = $1",
    ["admin"]
  );

  if (existe.rows.length === 0) {
    const senhaHash = await bcrypt.hash("123456", 10);
    await pool.query(
      "INSERT INTO usuarios (usuario, senha) VALUES ($1, $2)",
      ["admin", senhaHash]
    );
    console.log("Usuário admin criado");
  }
}
criarTabelas();

// =============================
// MIDDLEWARE DE PROTEÇÃO
// =============================
function verificarLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }
  next();
}

// =============================
// ROTAS
// =============================
app.get("/", verificarLogin, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
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

  const senhaValida = await bcrypt.compare(
    senha,
    result.rows[0].senha
  );

  if (!senhaValida) {
    return res.send("Senha incorreta");
  }

  req.session.usuario = usuario;
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando");
});
