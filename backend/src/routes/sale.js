
// src/routes/sales.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/sales.controller");
const { auth } = require("../middleware/auth");

router.post("/", auth, controller.crearVenta);

module.exports = router;
