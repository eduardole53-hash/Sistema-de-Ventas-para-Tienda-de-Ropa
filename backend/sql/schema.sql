-- schema.sql (PostgreSQL) - Tienda de Ropa

-- Tabla de usuarios del sistema (administradores / vendedores)
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre_usuario VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  rol VARCHAR(20) NOT NULL -- 'Admin' o 'Vendedor'
);

-- Tabla de clientes (clientes que compran en tienda/online)
CREATE TABLE IF NOT EXISTS cliente (
  id_cliente SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(200),
  direccion_envio TEXT,
  telefono VARCHAR(30)
);

-- Tabla de productos (modelo general)
CREATE TABLE IF NOT EXISTS producto (
  id_producto SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  marca VARCHAR(100),
  categoria VARCHAR(100),
  imagen_url TEXT,
  creado_en TIMESTAMP DEFAULT now()
);

-- Variantes de producto (talla, color, SKU, stock y precio)
CREATE TABLE IF NOT EXISTS variante (
  id_variante SERIAL PRIMARY KEY,
  id_producto INTEGER NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  talla VARCHAR(20),
  color VARCHAR(50),
  sku VARCHAR(100) UNIQUE,
  precio NUMERIC(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  creado_en TIMESTAMP DEFAULT now()
);

-- Ventas en caja / POS
CREATE TABLE IF NOT EXISTS venta (
  id_venta SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES usuario(id_usuario),
  fecha_hora TIMESTAMP DEFAULT now(),
  monto_total NUMERIC(12,2) NOT NULL,
  metodo_pago VARCHAR(50),
  nota TEXT
);

-- Detalle de cada venta (líneas)
CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle_venta SERIAL PRIMARY KEY,
  id_venta INTEGER NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
  id_variante INTEGER REFERENCES variante(id_variante),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL
);

-- Pedidos realizados por clientes (ecommerce)
CREATE TABLE IF NOT EXISTS pedido (
  id_pedido SERIAL PRIMARY KEY,
  id_cliente INTEGER REFERENCES cliente(id_cliente),
  fecha_hora TIMESTAMP DEFAULT now(),
  monto_total NUMERIC(12,2),
  estado_pedido VARCHAR(50) DEFAULT 'Pendiente',
  direccion_envio TEXT
);

-- Detalle de pedido
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id_detalle_pedido SERIAL PRIMARY KEY,
  id_pedido INTEGER NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  id_variante INTEGER REFERENCES variante(id_variante),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL
);

-- Índices sugeridos para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_variante_sku ON variante(sku);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto(categoria);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON venta(fecha_hora);
