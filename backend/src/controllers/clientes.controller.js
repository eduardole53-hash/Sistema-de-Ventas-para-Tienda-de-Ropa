// src/controllers/clientes.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

/**
 * Registro de cliente (e-commerce)
 * Espera: { nombre_completo, email, password }
 */
exports.registrarCliente = async (req, res) => {
  const { nombre_completo, email, password } = req.body;

  if (!nombre_completo || !email || !password) {
    return res
      .status(400)
      .json({ mensaje: "Nombre, correo y contraseña son obligatorios." });
  }

  try {
    // ¿Ya existe ese correo?
    const existe = await db.query(
      "SELECT id_cliente FROM cliente WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res
        .status(400)
        .json({ mensaje: "Ya existe una cuenta registrada con ese correo." });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO cliente (nombre_completo, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id_cliente, nombre_completo, email`,
      [nombre_completo, email, hash]
    );

    const cliente = result.rows[0];

    return res.json({
      mensaje: "Cliente registrado correctamente.",
      cliente,
    });
  } catch (error) {
    console.error("Error registrando cliente:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Login de cliente
 * Espera: { email, password }
 * Devuelve: { mensaje, token }
 */
exports.loginCliente = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ mensaje: "Correo y contraseña son obligatorios." });
  }

  try {
    const result = await db.query(
      "SELECT id_cliente, nombre_completo, email, password_hash FROM cliente WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ mensaje: "Credenciales inválidas." });
    }

    const cliente = result.rows[0];

    if (!cliente.password_hash) {
      return res.status(400).json({
        mensaje:
          "Esta cuenta no tiene contraseña configurada. Contacte con la tienda.",
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      cliente.password_hash
    );

    if (!passwordValida) {
      return res.status(400).json({ mensaje: "Credenciales inválidas." });
    }

    // Payload específico para clientes
    const token = jwt.sign(
      {
        id_cliente: cliente.id_cliente,
        nombre_completo: cliente.nombre_completo,
        email: cliente.email,
        tipo: "Cliente",
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ mensaje: "Login exitoso", token });
  } catch (error) {
    console.error("Error en login de cliente:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Perfil básico del cliente autenticado
 */
exports.obtenerPerfil = async (req, res) => {
  try {
    // auth.js ya validó el token; el payload está en req.user
    if (!req.user || !req.user.id_cliente) {
      return res
        .status(400)
        .json({ mensaje: "Token no corresponde a un cliente válido." });
    }

    const result = await db.query(
      "SELECT id_cliente, nombre_completo, email FROM cliente WHERE id_cliente = $1",
      [req.user.id_cliente]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Cliente no encontrado." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo perfil de cliente:", error);
    return res.status(500).json({ error: error.message });
  }
};
