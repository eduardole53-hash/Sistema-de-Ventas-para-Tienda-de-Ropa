// URL base de tu backend
const API_URL = "http://localhost:4000/api";

// Elementos del DOM
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

const userNameSpan = document.getElementById("user-name");
const userRoleSpan = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");

const productosTableBody = document.getElementById("productos-table-body");
const productosCountSpan = document.getElementById("productos-count");
const productosMessage = document.getElementById("productos-message");

// Panel de admin de productos
const productAdminPanel = document.getElementById("product-admin-panel");
const productForm = document.getElementById("product-form");
const productFormMessage = document.getElementById("product-form-message");

// Panel de variantes
const variantsPanel = document.getElementById("variants-panel");
const variantsProductNameSpan = document.getElementById(
  "variants-product-name"
);
const variantsTableBody = document.getElementById("variants-table-body");
const variantsMessage = document.getElementById("variants-message");
const variantsCountSpan = document.getElementById("variants-count");
const variantsCloseBtn = document.getElementById("variants-close-btn");
const variantForm = document.getElementById("variant-form");
const variantFormMessage = document.getElementById("variant-form-message");

// Producto actualmente seleccionado para gestionar variantes
let currentVariantProduct = null;

// --- Gestión de sesión con localStorage ---

function saveSession(token, usuario, rol) {
  localStorage.setItem(
    "sv_ropa_session",
    JSON.stringify({ token, usuario, rol })
  );
}

function loadSession() {
  const raw = localStorage.getItem("sv_ropa_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo sesión:", e);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("sv_ropa_session");
}

// --- Inicializar la app según haya o no sesión ---

function initFromSession() {
  const session = loadSession();
  if (session && session.token) {
    showApp(session);
    loadProductos(session.token);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}

function showApp(session) {
  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");

  userNameSpan.textContent = session.usuario || "-";
  userRoleSpan.textContent = session.rol || "-";

  // Mostrar panel de creación de productos solo a Admin
  if (
    session.rol &&
    session.rol.toLowerCase() === "admin" &&
    productAdminPanel
  ) {
    productAdminPanel.classList.remove("hidden");
  } else if (productAdminPanel) {
    productAdminPanel.classList.add("hidden");
  }
}

// --- Manejo de login ---

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "";
  loginMessage.classList.remove("error", "success");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    loginMessage.textContent = "Por favor, completa todos los campos.";
    loginMessage.classList.add("error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/usuario/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre_usuario: username,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "Error al iniciar sesión. Verifica tus datos.";
      loginMessage.textContent = msg;
      loginMessage.classList.add("error");
      return;
    }

    const data = await response.json();

    const token = data.token;
    if (!token) {
      loginMessage.textContent = "No se recibió token del servidor.";
      loginMessage.classList.add("error");
      return;
    }

    // Decodificar payload del JWT para obtener usuario y rol
    let usuario = username;
    let rol = "Desconocido";
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      usuario = payload.nombre_usuario || usuario;
      rol = payload.rol || rol;
    } catch (e) {
      console.warn("No se pudo decodificar el token JWT:", e);
    }

    saveSession(token, usuario, rol);
    loginMessage.textContent = "Inicio de sesión exitoso.";
    loginMessage.classList.add("success");

    showApp({ token, usuario, rol });
    loadProductos(token);
  } catch (error) {
    console.error("Error en login:", error);
    loginMessage.textContent =
      "Ocurrió un error al conectar con el servidor.";
    loginMessage.classList.add("error");
  }
});

// --- Cerrar sesión ---

logoutBtn.addEventListener("click", () => {
  clearSession();
  productosTableBody.innerHTML = "";
  productosMessage.textContent = "";
  productosCountSpan.textContent = "0 productos";
  hideVariantsPanel();
  showLogin();
});

// --- Cargar productos desde el backend ---

async function loadProductos(token) {
  productosMessage.textContent = "";
  productosMessage.classList.remove("error");
  productosTableBody.innerHTML = "";
  productosCountSpan.textContent = "Cargando...";

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/productos`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudieron obtener los productos.";
      productosMessage.textContent = msg;
      productosMessage.classList.add("error");
      productosCountSpan.textContent = "0 productos";
      return;
    }

    const productos = await response.json();

    if (!Array.isArray(productos) || productos.length === 0) {
      productosMessage.textContent = "No hay productos registrados aún.";
      productosCountSpan.textContent = "0 productos";
      return;
    }

    productosCountSpan.textContent = `${productos.length} productos`;

    const rowsHtml = productos
      .map((p) => {
        const safeName = String(p.nombre || "").replace(/"/g, "&quot;");
        return `
          <tr>
            <td>${p.id_producto}</td>
            <td>${p.nombre}</td>
            <td>${p.marca || "-"}</td>
            <td>${p.categoria || "-"}</td>
            <td>${p.descripcion || "-"}</td>
            <td>
              ${
                p.imagen_url
                  ? `<img src="${p.imagen_url}" alt="${safeName}" />`
                  : "-"
              }
            </td>
            <td>
              <button
                class="btn btn-secondary btn-small btn-variants"
                data-product-id="${p.id_producto}"
                data-product-name="${safeName}"
              >
                Variantes
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    productosTableBody.innerHTML = rowsHtml;
  } catch (error) {
    console.error("Error cargando productos:", error);
    productosMessage.textContent =
      "Error al cargar los productos desde el servidor.";
    productosMessage.classList.add("error");
    productosCountSpan.textContent = "0 productos";
  }
}

// --- Crear un nuevo producto (solo Admin) ---

async function createProduct(formData) {
  const session = loadSession();
  if (!session || !session.token) {
    productFormMessage.textContent =
      "Sesión no válida. Vuelve a iniciar sesión.";
    productFormMessage.classList.add("error");
    return;
  }

  productFormMessage.textContent = "";
  productFormMessage.classList.remove("error", "success");

  try {
    const response = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudo crear el producto.";
      productFormMessage.textContent = msg;
      productFormMessage.classList.add("error");
      return;
    }

    await response.json();

    productFormMessage.textContent = "Producto creado correctamente.";
    productFormMessage.classList.add("success");

    productForm.reset();

    loadProductos(session.token);
  } catch (error) {
    console.error("Error creando producto:", error);
    productFormMessage.textContent =
      "Error al conectar con el servidor para crear el producto.";
    productFormMessage.classList.add("error");
  }
}

// --- Listener del formulario de producto ---

if (productForm) {
  productForm.addEventListener("submit", (e) => {
    e.preventDefault();

    productFormMessage.textContent = "";
    productFormMessage.classList.remove("error", "success");

    const nombre = document.getElementById("product-name").value.trim();
    const marca = document.getElementById("product-brand").value.trim();
    const categoria = document
      .getElementById("product-category")
      .value.trim();
    const imagen_url = document
      .getElementById("product-image")
      .value.trim();
    const descripcion = document
      .getElementById("product-description")
      .value.trim();

    if (!nombre) {
      productFormMessage.textContent =
        "El nombre del producto es obligatorio.";
      productFormMessage.classList.add("error");
      return;
    }

    const payload = {
      nombre,
      descripcion,
      marca,
      categoria,
      imagen_url,
    };

    createProduct(payload);
  });
}

// === VARIANTES ===

// Mostrar panel de variantes para un producto
function showVariantsPanel(product) {
  currentVariantProduct = product;

  if (!variantsPanel) return;

  variantsProductNameSpan.textContent =
    `${product.nombre} (ID ${product.id_producto})`;
  variantsPanel.classList.remove("hidden");

  loadVariantsForCurrentProduct();
}

// Ocultar panel de variantes
function hideVariantsPanel() {
  currentVariantProduct = null;
  if (variantsPanel) {
    variantsPanel.classList.add("hidden");
  }
  if (variantsTableBody) {
    variantsTableBody.innerHTML = "";
  }
  if (variantsMessage) {
    variantsMessage.textContent = "";
    variantsMessage.classList.remove("error", "success");
  }
  if (variantsCountSpan) {
    variantsCountSpan.textContent = "0 variantes";
  }
  if (variantForm) {
    variantForm.reset();
    variantFormMessage.textContent = "";
    variantFormMessage.classList.remove("error", "success");
  }
}

// Cargar variantes desde el backend y filtrar por producto actual
async function loadVariantsForCurrentProduct() {
  if (!currentVariantProduct) return;

  const session = loadSession();
  if (!session || !session.token) {
    variantsMessage.textContent =
      "Sesión no válida. Vuelve a iniciar sesión.";
    variantsMessage.classList.add("error");
    return;
  }

  variantsMessage.textContent = "";
  variantsMessage.classList.remove("error", "success");
  variantsTableBody.innerHTML = "";
  variantsCountSpan.textContent = "Cargando...";

  try {
    const response = await fetch(`${API_URL}/variantes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudieron obtener las variantes.";
      variantsMessage.textContent = msg;
      variantsMessage.classList.add("error");
      variantsCountSpan.textContent = "0 variantes";
      return;
    }

    const variantes = await response.json();

    const filtered = Array.isArray(variantes)
      ? variantes.filter(
          (v) =>
            Number(v.id_producto) ===
            Number(currentVariantProduct.id_producto)
        )
      : [];

    if (filtered.length === 0) {
      variantsMessage.textContent =
        "Este producto aún no tiene variantes registradas.";
      variantsCountSpan.textContent = "0 variantes";
      return;
    }

    variantsCountSpan.textContent = `${filtered.length} variantes`;

    const rowsHtml = filtered
      .map((v) => {
        return `
          <tr>
            <td>${v.id_variante}</td>
            <td>${v.talla || "-"}</td>
            <td>${v.color || "-"}</td>
            <td>${v.sku || "-"}</td>
            <td>${v.precio != null ? Number(v.precio).toFixed(2) : "-"}</td>
            <td>${v.stock != null ? v.stock : "-"}</td>
          </tr>
        `;
      })
      .join("");

    variantsTableBody.innerHTML = rowsHtml;
  } catch (error) {
    console.error("Error cargando variantes:", error);
    variantsMessage.textContent =
      "Error al cargar las variantes desde el servidor.";
    variantsMessage.classList.add("error");
    variantsCountSpan.textContent = "0 variantes";
  }
}

// Crear variante para el producto actual
async function createVariantForCurrentProduct(formData) {
  const session = loadSession();
  if (!session || !session.token) {
    variantFormMessage.textContent =
      "Sesión no válida. Vuelve a iniciar sesión.";
    variantFormMessage.classList.add("error");
    return;
  }

  if (!currentVariantProduct) {
    variantFormMessage.textContent =
      "Selecciona primero un producto para agregar variantes.";
    variantFormMessage.classList.add("error");
    return;
  }

  variantFormMessage.textContent = "";
  variantFormMessage.classList.remove("error", "success");

  const payload = {
    ...formData,
    id_producto: currentVariantProduct.id_producto,
  };

  try {
    const response = await fetch(`${API_URL}/variantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudo crear la variante.";
      variantFormMessage.textContent = msg;
      variantFormMessage.classList.add("error");
      return;
    }

    await response.json();

    variantFormMessage.textContent = "Variante agregada correctamente.";
    variantFormMessage.classList.add("success");

    variantForm.reset();

    loadVariantsForCurrentProduct();
  } catch (error) {
    console.error("Error creando variante:", error);
    variantFormMessage.textContent =
      "Error al conectar con el servidor para crear la variante.";
    variantFormMessage.classList.add("error");
  }
}

// Listener del formulario de variantes
if (variantForm) {
  variantForm.addEventListener("submit", (e) => {
    e.preventDefault();

    variantFormMessage.textContent = "";
    variantFormMessage.classList.remove("error", "success");

    const talla = document.getElementById("variant-size").value.trim();
    const color = document.getElementById("variant-color").value.trim();
    const sku = document.getElementById("variant-sku").value.trim();
    const precioStr = document.getElementById("variant-price").value.trim();
    const stockStr = document.getElementById("variant-stock").value.trim();

    if (!talla || !color || !sku || !precioStr || !stockStr) {
      variantFormMessage.textContent =
        "Todos los campos marcados con * son obligatorios.";
      variantFormMessage.classList.add("error");
      return;
    }

    const precio = parseFloat(precioStr);
    const stock = parseInt(stockStr, 10);

    if (Number.isNaN(precio) || precio < 0) {
      variantFormMessage.textContent = "El precio no es válido.";
      variantFormMessage.classList.add("error");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      variantFormMessage.textContent = "El stock no es válido.";
      variantFormMessage.classList.add("error");
      return;
    }

    const payload = {
      talla,
      color,
      sku,
      precio,
      stock,
    };

    createVariantForCurrentProduct(payload);
  });
}

// Listener para el botón cerrar de variantes
if (variantsCloseBtn) {
  variantsCloseBtn.addEventListener("click", () => {
    hideVariantsPanel();
  });
}

// Delegación de eventos en la tabla de productos para botón Variantes
if (productosTableBody) {
  productosTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-variants");
    if (!btn) return;

    const idProducto = btn.getAttribute("data-product-id");
    const nombre = btn.getAttribute("data-product-name") || "";

    const product = {
      id_producto: Number(idProducto),
      nombre,
    };

    showVariantsPanel(product);
  });
}

// --- Iniciar al cargar la página ---
document.addEventListener("DOMContentLoaded", initFromSession);