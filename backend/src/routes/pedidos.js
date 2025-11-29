// src/routes/pedidos.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/pedidos.controller");
const { auth } = require("../middleware/auth");

// Crear pedido (requiere cliente autenticado)
router.post("/", auth, controller.crearPedido);

// Listar pedidos del cliente autenticado
router.get("/mis-pedidos", auth, controller.obtenerPedidosCliente);

module.exports = router;

