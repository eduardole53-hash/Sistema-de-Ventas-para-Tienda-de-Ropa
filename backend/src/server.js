// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// IMPORTAR RUTAS
const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products");
const variantsRoutes = require("./routes/variants");
const salesRoutes = require("./routes/sales");

// USAR RUTAS
app.use("/api/usuarios", usersRoutes);
app.use("/api/productos", productsRoutes);
app.use("/api/variantes", variantsRoutes);
app.use("/api/ventas", salesRoutes);

// RUTA SIMPLE PARA PROBAR
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// LEVANTAR SERVIDOR
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
