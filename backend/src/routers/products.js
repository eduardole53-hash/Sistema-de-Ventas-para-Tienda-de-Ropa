// src/routes/products.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/products.controller");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/", controller.obtenerProductos);
router.post("/", auth, adminOnly, controller.crearProducto);

module.exports = router;
