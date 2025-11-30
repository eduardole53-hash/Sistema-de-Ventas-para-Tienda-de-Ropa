// src/routes/user.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controller");
const { auth, adminOnly } = require("../middleware/auth");

// Login de usuarios internos
router.post("/login", userController.loginUsuario);

// Crear usuarios internos (solo Admin autenticado)
router.post("/register", auth, adminOnly, userController.registrarUsuario);

module.exports = router;

