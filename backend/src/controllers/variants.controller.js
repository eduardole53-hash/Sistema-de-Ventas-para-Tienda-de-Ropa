// src/controllers/variants.controller.js
const db = require("../db");

exports.obtenerVariantes = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM variante ORDER BY creado_en DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearVariante = async (req, res) => {
  const { id_producto, talla, color, sku, precio, stock } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO variante (id_producto, talla, color, sku, precio, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_producto, talla, color, sku, precio, stock]
    );

    res.json({ mensaje: "Variante creada", variante: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
