// src/routes/user.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controller");
const { auth, adminOnly } = require("../middleware/auth");

// Solo un ADMIN logueado puede crear nuevos usuarios internos
router.post("/register", auth, adminOnly, userController.registrarUsuario);

// Login de usuarios internos (admin, vendedor, etc.)
router.post("/login", userController.loginUsuario);

module.exports = router;

