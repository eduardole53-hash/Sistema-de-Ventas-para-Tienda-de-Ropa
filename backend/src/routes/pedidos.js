// src/routes/pedidos.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/pedidos.controller");
const { auth, adminOnly } = require("../middleware/auth");

// Crear pedido (requiere cliente autenticado)
router.post("/", auth, controller.crearPedido);

// Listar pedidos del cliente autenticado (solo pedidos propios)
router.get("/mis-pedidos", auth, controller.obtenerPedidosCliente);

//Listar TODOS los pedidos (solo Admin)
router.get("/", auth, adminOnly, controller.listarPedidos);

module.exports = router;

