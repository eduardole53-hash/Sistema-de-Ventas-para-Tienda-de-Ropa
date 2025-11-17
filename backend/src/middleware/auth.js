// src/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = {
  auth: (req, res, next) => {
    const token = req.headers["authorization"];

    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
      req.user = decoded; 
      next();
    } catch (error) {
      res.status(403).json({ error: "Token inválido o expirado" });
    }
  },

  adminOnly: (req, res, next) => {
    if (req.user.rol !== "Admin") {
      return res.status(403).json({ error: "Acceso denegado. Solo Admin." });
    }
    next();
  }
};
