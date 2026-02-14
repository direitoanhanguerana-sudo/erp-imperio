const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

let produtos = [];
let clientes = [];
let pedidos = [];

let produtoId = 1;
let clienteId = 1;
let pedidoId = 1;

/* ================= DASHBOARD ================= */

app.get("/dashboard", (req, res) => {
  const vendasTotal = pedidos.reduce((acc, p) => acc + p.total, 0);
  const estoqueBaixo = produtos.filter(p => p.estoque < 10).length;

  res.json({
    vendas_hoje: vendasTotal,
    vendas_mes: vendasTotal,
    total_pedidos: pedidos.length,
    total_clientes: clientes.length,
    produtos_estoque_baixo: estoqueBaixo
  });
});

/* ================= PRODUTOS ================= */

app.get("/produtos", (req, res) => {
  res.json(produtos);
});

app.post("/produtos", (req, res) => {
  const { nome, preco, estoque } = req.body;

  const novoProduto = {
    id: produtoId++,
    nome,
    preco: Number(preco),
    estoque: Number(estoque)
  };

  produtos.push(novoProduto);
  res.json(novoProduto);
});

/* ================= CLIENTES ================= */

app.get("/clientes", (req, res) => {
  res.json(clientes);
});

app.post("/clientes", (req, res) => {
  const { nome, telefone, email, endereco } = req.body;

  const novoCliente = {
    id: clienteId++,
    nome,
    telefone,
    email,
    endereco,
    criado_em: new Date()
  };

  clientes.push(novoCliente);
  res.json(novoCliente);
});

/* ================= PEDIDOS ================= */

app.post("/pedidos", (req, res) => {
  const { cliente_id, itens } = req.body;

  let total = 0;

  itens.forEach(item => {
    const produto = produtos.find(p => p.id === item.produto_id);

    if (!produto) {
      return res.status(400).json({ erro: "Produto não encontrado" });
    }

    if (produto.estoque < item.quantidade) {
      return res.status(400).json({ erro: "Estoque insuficiente" });
    }

    produto.estoque -= item.quantidade;
    total += produto.preco * item.quantidade;
  });

  const novoPedido = {
    id: pedidoId++,
    cliente_id,
    itens,
    total,
    criado_em: new Date()
  };

  pedidos.push(novoPedido);

  res.json({
    mensagem: "Pedido criado com sucesso",
    pedido_id: novoPedido.id,
    total
  });
});

/* ================= PAINEL VISUAL ================= */

app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>ERP Império Distribuidora</title>
    <style>
      body {
        font-family: Arial;
        background: #f5f6fa;
        margin: 0;
        padding: 30px;
      }
      h1 {
        text-align: center;
      }
      .container {
        max-width: 1000px;
        margin: auto;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 30px;
      }
      .card {
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        text-align: center;
      }
      .valor {
        font-size: 22px;
        font-weight: bold;
        color: #00b894;
        margin-top: 10px;
      }
      .menu {
        text-align: center;
        margin-top: 40px;
      }
      .menu a {
        margin: 10px;
        padding: 10px 20px;
        background: #0984e3;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 ERP Império Distribuidora</h1>
      <div class="cards">
        <div class="card">
          <div>Vendas Totais</div>
          <div class="valor">R$ ${pedidos.reduce((acc, p) => acc + p.total, 0).toFixed(2)}</div>
        </div>
        <div class="card">
          <div>Total Pedidos</div>
          <div class="valor">${pedidos.length}</div>
        </div>
        <div class="card">
          <div>Total Clientes</div>
          <div class="valor">${clientes.length}</div>
        </div>
        <div class="card">
          <div>Estoque Baixo</div>
          <div class="valor">${produtos.filter(p => p.estoque < 10).length}</div>
        </div>
      </div>

      <div class="menu">
        <a href="/produtos">Produtos</a>
        <a href="/clientes">Clientes</a>
      </div>
    </div>
  </body>
  </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));
