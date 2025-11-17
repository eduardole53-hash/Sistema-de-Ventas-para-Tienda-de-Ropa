// src/controllers/users.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

exports.registrarUsuario = async (req, res) => {
  const { nombre_usuario, password, rol } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO usuario (nombre_usuario, password_hash, rol) VALUES ($1, $2, $3) RETURNING id_usuario, nombre_usuario, rol",
      [nombre_usuario, hash, rol]
    );

    res.json({ mensaje: "Usuario creado", usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginUsuario = async (req, res) => {
  const { nombre_usuario, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM usuario WHERE nombre_usuario = $1",
      [nombre_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];

    const coincide = await bcrypt.compare(password, usuario.password_hash);

    if (!coincide) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ mensaje: "Login exitoso", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
