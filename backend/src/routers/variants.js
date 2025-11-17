// src/routes/variants.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/variants.controller");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/", controller.obtenerVariantes);
router.post("/", auth, adminOnly, controller.crearVariante);

module.exports = router;
