const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.urlencoded({ extended: true }));

// ================= DATABASE =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= SESSION =================
app.use(session({
  secret: 'imperio-seguro',
  resave: false,
  saveUninitialized: false
}));

// ================= AUTH MIDDLEWARE =================
function checkAuth(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
}

// ================= CRIAR TABELAS =================
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);
}

criarTabelas();

// ================= ROTA CRIAR ADMIN (PRIMEIRA VEZ) =================
app.get('/criar-admin', async (req, res) => {
  const senhaHash = await bcrypt.hash('123456', 10);

  await pool.query(`
    INSERT INTO usuarios (usuario, senha)
    VALUES ($1, $2)
    ON CONFLICT (usuario) DO NOTHING
  `, ['admin', senhaHash]);

  res.send('Admin criado! Usuário: admin | Senha: 123456');
});

// ================= LOGIN =================
app.get('/login', (req, res) => {
  res.send(`
    <h2>Login - ERP Império</h2>
    <form method="POST">
      <input name="usuario" placeholder="Usuário" required />
      <input name="senha" type="password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
  `);
});

app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  const result = await pool.query(
    'SELECT * FROM usuarios WHERE usuario = $1',
    [usuario]
  );

  if (result.rows.length === 0) {
    return res.send('Usuário não encontrado');
  }

  const user = result.rows[0];
  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    return res.send('Senha incorreta');
  }

  req.session.usuario = user.usuario;
  res.redirect('/');
});

// ================= LOGOUT =================
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ================= DASHBOARD =================
app.get('/', checkAuth, (req, res) => {
  res.send(`
    <h1>🚀 ERP Império Distribuidora</h1>
    <p>Usuário logado: ${req.session.usuario}</p>
    <a href="/logout">Sair</a>
  `);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando...');
});
