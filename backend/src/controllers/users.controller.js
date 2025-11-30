// src/controllers/users.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

/**
 * LOGIN de usuario interno (Admin, Vendedor, etc.)
 * Body esperado: { nombre_usuario, password }
 */
exports.loginUsuario = async (req, res) => {
  try {
    const { nombre_usuario, password } = req.body;

    if (!nombre_usuario || !password) {
      return res
        .status(400)
        .json({ mensaje: "Nombre de usuario y contraseña son obligatorios." });
    }

    const result = await db.query(
      "SELECT id_usuario, nombre_usuario, password_hash, rol FROM usuario WHERE nombre_usuario = $1",
      [nombre_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const usuario = result.rows[0];

    const passwordValida = await bcrypt.compare(
      password,
      usuario.password_hash
    );
    if (!passwordValida) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      mensaje: "Login exitoso.",
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en loginUsuario:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno al iniciar sesión.", error: error.message });
  }
};

/**
 * REGISTRO de usuario interno (solo Admin)
 * Body esperado: { nombre_usuario, password, rol }
 */
exports.registrarUsuario = async (req, res) => {
  try {
    const { nombre_usuario, password, rol } = req.body;

    if (!nombre_usuario || !password || !rol) {
      return res
        .status(400)
        .json({ mensaje: "Nombre de usuario, contraseña y rol son obligatorios." });
    }

    // Verificar si ya existe
    const existente = await db.query(
      "SELECT id_usuario FROM usuario WHERE nombre_usuario = $1",
      [nombre_usuario]
    );
    if (existente.rows.length > 0) {
      return res
        .status(409)
        .json({ mensaje: "Ya existe un usuario con ese nombre." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await db.query(
      `INSERT INTO usuario (nombre_usuario, password_hash, rol)
       VALUES ($1, $2, $3)
       RETURNING id_usuario, nombre_usuario, rol`,
      [nombre_usuario, passwordHash, rol]
    );

    const nuevo = insert.rows[0];

    res.status(201).json({
      mensaje: "Usuario creado correctamente.",
      usuario: nuevo,
    });
  } catch (error) {
    console.error("Error en registrarUsuario:", error);
    res.status(500).json({
      mensaje: "Error interno al crear el usuario.",
      error: error.message,
    });
  }
};
