const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("ERP Império Distribuidora Online 🚀");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Servidor rodando...");
});
