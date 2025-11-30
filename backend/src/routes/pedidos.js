// src/routes/pedidos.js
const express = require("express");
const router = express.Router();

const controller = require("../controllers/pedidos.controller");
const { auth, adminOnly } = require("../middleware/auth");
const authCliente = require("../middleware/authCliente");

// Crear pedido (CLIENTE autenticado desde tienda.html)
router.post("/", authCliente, controller.crearPedido);

// Listar pedidos del cliente autenticado (solo ve sus propios pedidos)
router.get("/mis-pedidos", authCliente, controller.obtenerPedidosCliente);

// Listar TODOS los pedidos (solo Admin del sistema interno)
router.get("/", auth, adminOnly, controller.listarPedidos);

module.exports = router;
