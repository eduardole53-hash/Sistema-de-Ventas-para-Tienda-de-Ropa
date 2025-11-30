// src/middleware/authCliente.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Middleware de autenticación para CLIENTES del e-commerce.
 * - Lee Authorization: Bearer <token>
 * - Verifica con JWT_SECRET
 * - Valida que tenga id_cliente y tipo === "Cliente"
 * - Deja el payload en req.user
 */
module.exports = function authCliente(req, res, next) {
  const header = req.headers["authorization"] || req.headers["Authorization"];

  if (!header) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  // Puede venir como "Bearer xxxxx" o solo el token
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 💡 Aseguramos que sea un token de CLIENTE, no de usuario interno
    if (!decoded.id_cliente || decoded.tipo !== "Cliente") {
      return res
        .status(400)
        .json({ mensaje: "El token no corresponde a un cliente válido." });
    }

    // Para tu controlador, seguimos usando req.user
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Error verificando token de cliente:", error.message);
    return res.status(403).json({ mensaje: "Token inválido o expirado" });
  }
};
