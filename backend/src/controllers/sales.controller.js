// src/controllers/sale.controller.js
const db = require("../db");

/**
 * Crear una venta física desde el POS
 */
exports.crearVenta = async (req, res) => {
  try {
    const { metodo_pago, nota, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: "La venta debe contener ítems." });
    }

    const id_usuario = req.user.id; // viene del JWT

    let total = 0;

    // Calcular el total
    for (const item of items) {
      const precioResult = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      if (precioResult.rows.length === 0) {
        return res.status(400).json({ mensaje: "Variante no encontrada." });
      }

      const precio = Number(precioResult.rows[0].precio);
      total += precio * item.cantidad;
    }

    // Crear venta
    const ventaResult = await db.query(
      `INSERT INTO venta (id_usuario, monto_total, metodo_pago, nota, fecha_hora)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id_usuario, total, metodo_pago, nota || null]
    );

    const venta = ventaResult.rows[0];

    // Insertar detalle y reducir stock
    for (const item of items) {
      const precioResult = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      const precio = precioResult.rows[0].precio;

      await db.query(
        `INSERT INTO detalle_venta (id_venta, id_variante, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [venta.id_venta, item.id_variante, item.cantidad, precio]
      );

      await db.query(
        "UPDATE variante SET stock = stock - $1 WHERE id_variante = $2",
        [item.cantidad, item.id_variante]
      );
    }

    res.json({
      mensaje: "Venta creada correctamente.",
      venta,
    });
  } catch (error) {
    console.error("Error crearVenta:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Listar todas las ventas físicas (solo Admin)
 */
exports.listarVentas = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id_venta,
        fecha_hora AS fecha,
        monto_total AS total,
        metodo_pago,
        id_usuario
      FROM venta
      ORDER BY fecha_hora DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error en listarVentas:", error);
    res.status(500).json({
      mensaje: "Error interno al obtener las ventas.",
      error: error.message,
    });
  }
};
