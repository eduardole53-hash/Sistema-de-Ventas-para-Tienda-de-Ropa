// src/controllers/pedidos.controller.js
const db = require("../db");

/**
 * Crear un nuevo pedido (e-commerce)
 * Espera body:
 * {
 *   metodo_pago,
 *   direccion_envio,
 *   items: [{ id_variante, cantidad }]
 * }
 *
 * Requiere:
 *   - Token de CLIENTE válido (authCliente)
 *   - authCliente coloca el payload en req.user => { id_cliente, nombre_completo, email, tipo: "Cliente" }
 */
exports.crearPedido = async (req, res) => {
  const { metodo_pago, direccion_envio, items } = req.body;

  // Validar items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ mensaje: "Debes enviar al menos un ítem en el pedido." });
  }

  // Validar que el token sea de cliente
  if (!req.user || !req.user.id_cliente) {
    return res
      .status(400)
      .json({ mensaje: "El token no corresponde a un cliente válido." });
  }

  const id_cliente = req.user.id_cliente;

  // Usamos conexión dedicada para poder manejar transacción
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;
    const itemsProcesados = [];

    // 1. Validar stock y calcular total
    for (const item of items) {
      const { id_variante, cantidad } = item;

      if (!id_variante || !cantidad || cantidad <= 0) {
        throw new Error(
          "Cada ítem debe tener id_variante y cantidad mayor a 0."
        );
      }

      const varianteResult = await client.query(
        "SELECT id_variante, precio, stock FROM variante WHERE id_variante = $1",
        [id_variante]
      );

      if (varianteResult.rows.length === 0) {
        throw new Error(`La variante ${id_variante} no existe.`);
      }

      const variante = varianteResult.rows[0];
      const precio = Number(variante.precio || 0);

      const stockActual =
        variante.stock === null || variante.stock === undefined
          ? null
          : Number(variante.stock);

      if (stockActual !== null && stockActual < cantidad) {
        throw new Error(
          `Stock insuficiente para la variante ${id_variante}. Disponible: ${stockActual}`
        );
      }

      const subtotal = precio * cantidad;
      total += subtotal;

      itemsProcesados.push({
        id_variante,
        cantidad,
        precio_unitario: precio,
      });
    }

    // 2. Crear el pedido
    const pedidoResult = await client.query(
      `INSERT INTO pedido (
         id_cliente,
         fecha_hora,
         total,
         metodo_pago,
         direccion_envio,
         estado_pedido
       )
       VALUES ($1, NOW(), $2, $3, $4, $5)
       RETURNING id_pedido, id_cliente, fecha_hora, total, metodo_pago, direccion_envio, estado_pedido`,
      [
        id_cliente,
        total,
        metodo_pago || null,
        direccion_envio || null,
        "Pendiente",
      ]
    );

    const pedido = pedidoResult.rows[0];

    // 3. Insertar detalle y actualizar stock
    for (const item of itemsProcesados) {
      await client.query(
        `INSERT INTO detalle_pedido (
           id_pedido,
           id_variante,
           cantidad,
           precio_unitario
         )
         VALUES ($1, $2, $3, $4)`,
        [
          pedido.id_pedido,
          item.id_variante,
          item.cantidad,
          item.precio_unitario,
        ]
      );

      await client.query(
        "UPDATE variante SET stock = stock - $1 WHERE id_variante = $2",
        [item.cantidad, item.id_variante]
      );
    }

    await client.query("COMMIT");

    return res.json({
      mensaje: "Pedido creado correctamente.",
      pedido,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creando pedido:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

/**
 * Listar pedidos del CLIENTE autenticado (para tienda.html)
 * GET /api/pedidos/mis-pedidos
 * Requiere authCliente (token con id_cliente, tipo: "Cliente")
 */
exports.obtenerPedidosCliente = async (req, res) => {
  if (!req.user || !req.user.id_cliente) {
    return res
      .status(400)
      .json({ mensaje: "El token no corresponde a un cliente válido." });
  }

  const id_cliente = req.user.id_cliente;

  try {
    const result = await db.query(
      `SELECT
         id_pedido,
         fecha_hora,
         total,
         metodo_pago,
         direccion_envio,
         estado_pedido
       FROM pedido
       WHERE id_cliente = $1
       ORDER BY fecha_hora DESC`,
      [id_cliente]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Error listando pedidos de cliente:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Listar TODOS los pedidos (para el panel de admin en el index)
 * GET /api/pedidos
 * Requiere:
 *   - auth (token con rol)
 *   - adminOnly (req.user.rol === "Admin")
 */
exports.listarPedidos = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id_pedido,
         fecha_hora AS fecha,
         total,
         metodo_pago,
         direccion_envio,
         estado_pedido AS estado
       FROM pedido
       ORDER BY fecha_hora DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error en listarPedidos:", error);
    res.status(500).json({
      mensaje: "Error interno al obtener los pedidos.",
      error: error.message,
    });
  }
};

