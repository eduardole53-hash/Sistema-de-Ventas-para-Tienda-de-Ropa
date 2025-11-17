// src/controllers/products.controller.js
const db = require("../db");

exports.obtenerProductos = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM producto ORDER BY creado_en DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearProducto = async (req, res) => {
  const { nombre, descripcion, marca, categoria, imagen_url } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO producto (nombre, descripcion, marca, categoria, imagen_url) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, marca, categoria, imagen_url]
    );

    res.json({ mensaje: "Producto creado", producto: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
