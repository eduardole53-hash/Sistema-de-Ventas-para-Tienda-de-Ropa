// src/routes/sale.js
const express = require("express");
const router = express.Router();
const saleController = require("../controllers/sale.controller");
const { auth, adminOnly } = require("../middleware/auth");

// Registrar venta (ya lo usas desde el POS)
router.post("/", auth, saleController.crearVenta);

//  listar todas las ventas físicas
router.get("/", auth, adminOnly, saleController.listarVentas);

module.exports = router;
