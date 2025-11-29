// src/routes/clientes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/clientes.controller");
const { auth } = require("../middleware/auth");

// Registro de cliente
router.post("/register", controller.registrarCliente);

// Login de cliente
router.post("/login", controller.loginCliente);

// Perfil del cliente autenticado (para futuro si lo usas)
router.get("/me", auth, controller.obtenerPerfil);

module.exports = router;
