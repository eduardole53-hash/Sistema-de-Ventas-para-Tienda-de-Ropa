// src/routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controller");

router.post("/register", userController.registrarUsuario);
router.post("/login", userController.loginUsuario);

module.exports = router;
