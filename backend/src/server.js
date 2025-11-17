require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// IMPORTAR RUTAS
const userRoutes = require("./routes/user");
const productsRoutes = require("./routes/products");
const variantsRoutes = require("./routes/variants");
const saleRoutes = require("./routes/sale");

// USAR RUTAS
app.use("/api/usuario", userRoutes);
app.use("/api/productos", productsRoutes);
app.use("/api/variantes", variantsRoutes);
app.use("/api/venta", saleRoutes);

// RUTA SIMPLE PARA PROBAR
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// LEVANTAR SERVIDOR
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
