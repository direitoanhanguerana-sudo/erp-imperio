const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "erp_imperio_secret",
    resave: false,
    saveUninitialized: false,
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* =========================
   CRIAR TABELAS
========================= */
async function criar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      senha VARCHAR(255)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      preco NUMERIC(10,2),
      estoque INTEGER
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      telefone VARCHAR(20),
      email VARCHAR(100)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER,
      total NUMERIC(10,2),
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Criar usuários padrão se não existirem
  const senhaHash = await bcrypt.hash("imperio2026", 10);

  const usuarios = [
    { nome: "Fabio Bandeira", email: "fabio@imperio.com" },
    { nome: "Alam Guedes", email: "alam@imperio.com" },
    { nome: "Grasiela Soraia", email: "grasiela@imperio.com" },
    { nome: "Kellyane Bandeira", email: "kellyane@imperio.com" },
  ];

  for (let u of usuarios) {
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha)
       VALUES ($1,$2,$3)
       ON CONFLICT (email) DO NOTHING`,
      [u.nome, u.email, senhaHash]
    );
  }
}

criar();

/* =========================
   MIDDLEWARE LOGIN
========================= */
function verificarLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/login");
  }
  next();
}

/* =========================
   LOGIN
========================= */
app.get("/login", (req, res) => {
  res.send(`
    <h2>Login ERP Império</h2>
    <form method="POST">
      <input name="email" placeholder="Email" required />
      <input name="senha" type="password" placeholder="Senha" required />
      <button>Entrar</button>
    </form>
  `);
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await pool.query(
    "SELECT * FROM usuarios WHERE email=$1",
    [email]
  );

  if (usuario.rows.length === 0) {
    return res.send("Usuário não encontrado");
  }

  const senhaValida = await bcrypt.compare(
    senha,
    usuario.rows[0].senha
  );

  if (!senhaValida) {
    return res.send("Senha incorreta");
  }

  req.session.usuario = usuario.rows[0];
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

/* =========================
   DASHBOARD
========================= */
app.get("/", verificarLogin, async (req, res) => {
  const vendas = await pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos");

  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Usuário: ${req.session.usuario.nome}</p>
    <p>Vendas Totais: R$ ${vendas.rows[0].coalesce}</p>
    <a href="/produtos">Produtos</a><br>
    <a href="/clientes">Clientes</a><br>
    <a href="/pedidos">Pedidos</a><br>
    <a href="/logout">Sair</a>
  `);
});

/* =========================
   PRODUTOS
========================= */
app.get("/produtos", verificarLogin, async (req, res) => {
  const produtos = await pool.query("SELECT * FROM produtos");

  res.send(`
    <h2>Produtos</h2>
    <form method="POST">
      <input name="nome" required placeholder="Nome"/>
      <input name="preco" type="number" step="0.01" required placeholder="Preço"/>
      <input name="estoque" type="number" required placeholder="Estoque"/>
      <button>Salvar</button>
    </form>
    ${produtos.rows.map(p =>
      `<p>${p.nome} | R$ ${p.preco} | Estoque: ${p.estoque}</p>`
    ).join("")}
    <br><a href="/">Voltar</a>
  `);
});

app.post("/produtos", verificarLogin, async (req, res) => {
  const { nome, preco, estoque } = req.body;
  await pool.query(
    "INSERT INTO produtos (nome, preco, estoque) VALUES ($1,$2,$3)",
    [nome, preco, estoque]
  );
  res.redirect("/produtos");
});

/* =========================
   CLIENTES
========================= */
app.get("/clientes", verificarLogin, async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");

  res.send(`
    <h2>Clientes</h2>
    <form method="POST">
      <input name="nome" required placeholder="Nome"/>
      <input name="telefone" placeholder="Telefone"/>
      <input name="email" placeholder="Email"/>
      <button>Salvar</button>
    </form>
    ${clientes.rows.map(c =>
      `<p>${c.nome}</p>`
    ).join("")}
    <br><a href="/">Voltar</a>
  `);
});

app.post("/clientes", verificarLogin, async (req, res) => {
  const { nome, telefone, email } = req.body;
  await pool.query(
    "INSERT INTO clientes (nome, telefone, email) VALUES ($1,$2,$3)",
    [nome, telefone, email]
  );
  res.redirect("/clientes");
});

/* =========================
   PEDIDOS COM BAIXA ESTOQUE
========================= */
app.get("/pedidos", verificarLogin, async (req, res) => {
  const clientes = await pool.query("SELECT * FROM clientes");
  const produtos = await pool.query("SELECT * FROM produtos");

  res.send(`
    <h2>Novo Pedido</h2>
    <form method="POST">
      <select name="cliente_id">
        ${clientes.rows.map(c =>
          `<option value="${c.id}">${c.nome}</option>`
        ).join("")}
      </select>
      <select name="produto_id">
        ${produtos.rows.map(p =>
          `<option value="${p.id}">${p.nome} (Estoque: ${p.estoque})</option>`
        ).join("")}
      </select>
      <input name="quantidade" type="number" required placeholder="Qtd"/>
      <button>Salvar</button>
    </form>
    <br><a href="/">Voltar</a>
  `);
});

app.post("/pedidos", verificarLogin, async (req, res) => {
  const { cliente_id, produto_id, quantidade } = req.body;

  const produto = await pool.query(
    "SELECT * FROM produtos WHERE id=$1",
    [produto_id]
  );

  if (produto.rows[0].estoque < quantidade) {
    return res.send("Estoque insuficiente");
  }

  const total = produto.rows[0].preco * quantidade;

  await pool.query(
    "INSERT INTO pedidos (cliente_id, produto_id, quantidade, total) VALUES ($1,$2,$3,$4)",
    [cliente_id, produto_id, quantidade, total]
  );

  await pool.query(
    "UPDATE produtos SET estoque = estoque - $1 WHERE id=$2",
    [quantidade, produto_id]
  );

  res.redirect("/");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor rodando 🚀"));
