// src/controllers/sales.controller.js
const db = require("../db");

exports.crearVenta = async (req, res) => {
  const { cliente_id, metodo_pago, nota, items } = req.body;
  const id_usuario = req.user.id_usuario;

  try {
    let total = 0;

    for (const item of items) {
      const precio = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      total += precio.rows[0].precio * item.cantidad;
    }

    const venta = await db.query(
      `INSERT INTO venta (id_usuario, monto_total, metodo_pago, nota)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id_usuario, total, metodo_pago, nota]
    );

    for (const item of items) {
      const precio = await db.query(
        "SELECT precio FROM variante WHERE id_variante = $1",
        [item.id_variante]
      );

      await db.query(
        `INSERT INTO detalle_venta (id_venta, id_variante, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [venta.rows[0].id_venta, item.id_variante, item.cantidad, precio.rows[0].precio]
      );

      await db.query(
        "UPDATE variante SET stock = stock - $1 WHERE id_variante = $2",
        [item.cantidad, item.id_variante]
      );
    }

    res.json({ mensaje: "Venta creada correctamente", venta: venta.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
