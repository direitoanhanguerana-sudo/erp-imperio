const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// ==============================
// CONEXÃO COM BANCO
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==============================
// CRIAR TABELAS AUTOMATICAMENTE
// ==============================
async function criarTabelas() {
  try {

    // TABELA USUARIOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nivel TEXT DEFAULT 'admin'
      );
    `);

    // Criar usuário padrão se não existir
    const usuarioPadrao = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      ["admin"]
    );

    if (usuarioPadrao.rows.length === 0) {
      const senhaHash = await bcrypt.hash("123456", 10);
      await pool.query(
        "INSERT INTO usuarios (usuario, senha) VALUES ($1, $2)",
        ["admin", senhaHash]
      );
      console.log("Usuário admin criado!");
    }

    // TABELA PRODUTOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        preco NUMERIC NOT NULL,
        estoque INTEGER NOT NULL
      );
    `);

    // TABELA CLIENTES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        telefone TEXT,
        endereco TEXT
      );
    `);

    console.log("Tabelas verificadas com sucesso!");

  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

criarTabelas();

// ==============================
// ROTAS
// ==============================

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE usuario = $1",
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.send("Usuário não encontrado");
    }

    const usuarioDB = result.rows[0];

    const senhaValida = await bcrypt.compare(senha, usuarioDB.senha);

    if (!senhaValida) {
      return res.send("Senha incorreta");
    }

    res.send("Login realizado com sucesso!");

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno no servidor");
  }
});

// ==============================
// SERVIDOR
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
