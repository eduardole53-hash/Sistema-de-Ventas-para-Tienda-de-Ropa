// src/controllers/sale.controller.js
const db = require("../db");

/**
 * Crear una venta (usado por el POS)
 * Body esperado: { cliente_id (opcional), metodo_pago, nota, items[] }
 * items = [{ id_variante, cantidad }]
 */
exports.crearVenta = async (req, res) => {
  const { cliente_id, metodo_pago, nota, items } = req.body;

  // OJO: según tu middleware, normalmente viene como req.user.id
  // Si en tu token guardaste "id", cambia a req.user.id
  const id_usuario = req.user.id_usuario || req.user.id;

  try {
    let total = 0;

    // Calcular monto total a partir de las variantes
    for (const item of items) {
      const precio = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      if (precio.rows.length === 0) {
        return res.status(400).json({
          mensaje: `No se encontró la variante con id ${item.id_variante}`,
        });
      }

      total += precio.rows[0].precio * item.cantidad;
    }

    // Insertar en venta
    const venta = await db.query(
      `INSERT INTO venta (id_usuario, monto_total, metodo_pago, nota, cliente_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_usuario, total, metodo_pago, nota || null, cliente_id || null]
    );

    // Insertar detalles y actualizar stock
    for (const item of items) {
      const precio = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      await db.query(
        `INSERT INTO detalle_venta (id_venta, id_variante, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [
          venta.rows[0].id_venta,
          item.id_variante,
          item.cantidad,
          precio.rows[0].precio,
        ]
      );

      await db.query(
        "UPDATE variante SET stock = stock - $1 WHERE id_variante = $2",
        [item.cantidad, item.id_variante]
      );
    }

    res.json({
      mensaje: "Venta creada correctamente",
      venta: venta.rows[0],
    });
  } catch (error) {
    console.error("Error en crearVenta:", error);
    res.status(500).json({ mensaje: "Error al crear la venta.", error: error.message });
  }
};

/**
 * Listar todas las ventas físicas
 * GET /api/venta
 */
exports.listarVentas = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id_venta,
         id_usuario,
         fecha_hora AS fecha,
         metodo_pago,
         monto_total AS total
       FROM venta
       ORDER BY fecha_hora DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error en listarVentas:", error);
    res.status(500).json({
      mensaje: "Error interno al obtener las ventas.",
      error: error.message,
    });
  }
};
