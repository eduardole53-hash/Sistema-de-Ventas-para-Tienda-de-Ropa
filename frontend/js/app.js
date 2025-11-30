// URL base de tu backend
const API_URL = "http://localhost:4000/api";
// Endpoint de ventas
const SALES_ENDPOINT = `${API_URL}/venta`;

// Elementos del DOM
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

const userNameSpan = document.getElementById("user-name");
const userRoleSpan = document.getElementById("user-role");
const logoutBtn = document.getElementById("logout-btn");

const contentTitle = document.getElementById("content-title");
const views = document.querySelectorAll(".view");
const viewButtons = document.querySelectorAll("[data-view]");

// Productos / variantes
const productosTableBody = document.getElementById("productos-table-body");
const productosCountSpan = document.getElementById("productos-count");
const productosMessage = document.getElementById("productos-message");

const productAdminPanel = document.getElementById("product-admin-panel");
const productForm = document.getElementById("product-form");
const productFormMessage = document.getElementById("product-form-message");

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

// POS
const posItemForm = document.getElementById("pos-item-form");
const posProductSelect = document.getElementById("pos-product-select");
const posVariantSelect = document.getElementById("pos-variant-select");
const posQuantityInput = document.getElementById("pos-quantity");
const posUnitPriceInput = document.getElementById("pos-unit-price");
const posStockInfo = document.getElementById("pos-stock-info");
const posItemMessage = document.getElementById("pos-item-message");

const posCartBody = document.getElementById("pos-cart-body");
const posCartMessage = document.getElementById("pos-cart-message");
const posCartCountSpan = document.getElementById("pos-cart-count");
const posCartTotalSpan = document.getElementById("pos-cart-total");
const posCustomerInput = document.getElementById("pos-customer-name");
const posPaymentSelect = document.getElementById("pos-payment-method");
const posConfirmBtn = document.getElementById("pos-confirm-btn");

// --- Formulario de creación de usuarios internos ---
const userForm = document.getElementById("user-form");
const userFormMessage = document.getElementById("user-form-message");


// Recibo
const receiptPanel = document.getElementById("receipt-panel");
const receiptIdSpan = document.getElementById("receipt-id");
const receiptDateSpan = document.getElementById("receipt-date");
const receiptCustomerSpan = document.getElementById("receipt-customer");
const receiptPaymentSpan = document.getElementById("receipt-payment");
const receiptItemsBody = document.getElementById("receipt-items-body");
const receiptTotalSpan = document.getElementById("receipt-total");
const receiptPrintBtn = document.getElementById("receipt-print-btn");

// Estado global
let currentVariantProduct = null;
let allProducts = [];
let allVariants = [];
let posCart = [];
let posInitialized = false;
let lastReceipt = null;

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

// --- Cambio de vistas (Productos / POS) ---

function switchView(target) {
  views.forEach((v) => {
    const viewName = v.id.replace("view-", "");
    v.classList.toggle("active-view", viewName === target);
  });

  if (target === "productos") {
    contentTitle.textContent = "Productos";
  } else if (target === "pos") {
    contentTitle.textContent = "Punto de venta";
    initPOS();
  } else if (target === "usuarios") {
    contentTitle.textContent = "Gestión de usuarios";
  }
}


viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-view");
    switchView(target);
  });
});

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
  resetPOS();
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
    allProducts = Array.isArray(productos) ? productos : [];

    if (allProducts.length === 0) {
      productosMessage.textContent = "No hay productos registrados aún.";
      productosCountSpan.textContent = "0 productos";
      return;
    }

    productosCountSpan.textContent = `${allProducts.length} productos`;

    const rowsHtml = allProducts
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

// --- Crear producto ---

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

function showVariantsPanel(product) {
  currentVariantProduct = product;

  if (!variantsPanel) return;

  variantsProductNameSpan.textContent =
    `${product.nombre} (ID ${product.id_producto})`;
  variantsPanel.classList.remove("hidden");

  loadVariantsForCurrentProduct();
}

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
    allVariants = Array.isArray(variantes) ? variantes : [];

    const filtered = allVariants.filter(
      (v) =>
        Number(v.id_producto) === Number(currentVariantProduct.id_producto)
    );

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

if (variantsCloseBtn) {
  variantsCloseBtn.addEventListener("click", () => {
    hideVariantsPanel();
  });
}

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

// === POS ===

function resetPOS() {
  posCart = [];
  posCartBody.innerHTML = "";
  posCartMessage.textContent = "";
  posCartCountSpan.textContent = "0";
  posCartTotalSpan.textContent = "0.00";
  posCustomerInput.value = "";
  posPaymentSelect.value = "";
  posItemMessage.textContent = "";
  posItemMessage.classList.remove("error", "success");
  posStockInfo.textContent = "";
  posStockInfo.classList.remove("error", "success");

  if (posProductSelect) {
    posProductSelect.innerHTML =
      '<option value="">Selecciona un producto...</option>';
  }
  if (posVariantSelect) {
    posVariantSelect.innerHTML =
      '<option value="">Selecciona primero un producto...</option>';
    posVariantSelect.disabled = true;
  }
  posQuantityInput.value = "1";
  posUnitPriceInput.value = "";

  // ocultar recibo
  if (receiptPanel) {
    receiptPanel.classList.add("hidden");
  }

  posInitialized = false;
}

async function initPOS() {
  if (posInitialized) return;

  const session = loadSession();
  if (!session || !session.token) {
    posItemMessage.textContent =
      "Sesión no válida. Vuelve a iniciar sesión.";
    posItemMessage.classList.add("error");
    return;
  }

  posItemMessage.textContent = "";
  posItemMessage.classList.remove("error", "success");
  posStockInfo.textContent = "";

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    };

    const [prodRes, varRes] = await Promise.all([
      fetch(`${API_URL}/productos`, { headers }),
      fetch(`${API_URL}/variantes`, { headers }),
    ]);

    if (!prodRes.ok) {
      throw new Error("Error al cargar productos para POS.");
    }
    if (!varRes.ok) {
      throw new Error("Error al cargar variantes para POS.");
    }

    const productos = await prodRes.json();
    const variantes = await varRes.json();

    allProducts = Array.isArray(productos) ? productos : [];
    allVariants = Array.isArray(variantes) ? variantes : [];

    posProductSelect.innerHTML =
      '<option value="">Selecciona un producto...</option>';

    allProducts.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id_producto;
      opt.textContent = `${p.nombre} (${p.categoria || "Sin categoría"})`;
      posProductSelect.appendChild(opt);
    });

    posVariantSelect.innerHTML =
      '<option value="">Selecciona primero un producto...</option>';
    posVariantSelect.disabled = true;

    posInitialized = true;
  } catch (error) {
    console.error("Error inicializando POS:", error);
    posItemMessage.textContent =
      "No se pudieron cargar los datos para el POS.";
    posItemMessage.classList.add("error");
  }
}

function getVariantById(idVariante) {
  return allVariants.find(
    (v) => Number(v.id_variante) === Number(idVariante)
  );
}

function updateVariantOptionsForProduct(productId) {
  posVariantSelect.innerHTML = "";
  posVariantSelect.disabled = true;
  posUnitPriceInput.value = "";
  posStockInfo.textContent = "";

  const variantsForProduct = allVariants.filter(
    (v) => Number(v.id_producto) === Number(productId)
  );

  if (variantsForProduct.length === 0) {
    posVariantSelect.innerHTML =
      '<option value="">Este producto no tiene variantes.</option>';
    return;
  }

  posVariantSelect.disabled = false;
  posVariantSelect.innerHTML =
    '<option value="">Selecciona una variante...</option>';

  variantsForProduct.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id_variante;
    const precioStr =
      v.precio != null ? `B/. ${Number(v.precio).toFixed(2)}` : "Sin precio";
    const stockStr =
      v.stock != null ? `Stock: ${v.stock}` : "Stock: desconocido";
    opt.textContent = `${v.talla || "-"} / ${v.color || "-"} - ${precioStr} (${stockStr})`;
    posVariantSelect.appendChild(opt);
  });
}

function updatePOSVariantInfo() {
  const idVariante = posVariantSelect.value;
  if (!idVariante) {
    posUnitPriceInput.value = "";
    posStockInfo.textContent = "";
    return;
  }

  const variant = getVariantById(idVariante);
  if (!variant) return;

  const precio = variant.precio != null ? Number(variant.precio) : 0;
  const stock = variant.stock != null ? variant.stock : 0;

  posUnitPriceInput.value = `B/. ${precio.toFixed(2)}`;
  posStockInfo.textContent = `Stock disponible: ${stock} unidades.`;
  posStockInfo.classList.remove("error", "success");
}

function getCartQuantityForVariant(idVariante) {
  return posCart
    .filter((item) => Number(item.id_variante) === Number(idVariante))
    .reduce((sum, item) => sum + item.cantidad, 0);
}

function renderCart() {
  if (posCart.length === 0) {
    posCartBody.innerHTML = "";
    posCartCountSpan.textContent = "0";
    posCartTotalSpan.textContent = "0.00";
    return;
  }

  let total = 0;

  const rowsHtml = posCart
    .map((item, index) => {
      const subtotal = item.cantidad * item.precio;
      total += subtotal;
      return `
        <tr data-index="${index}">
          <td>${item.producto}</td>
          <td>${item.talla}</td>
          <td>${item.color}</td>
          <td>${item.sku}</td>
          <td>${item.precio.toFixed(2)}</td>
          <td>${item.cantidad}</td>
          <td>${subtotal.toFixed(2)}</td>
          <td>
            <button class="btn btn-outline btn-small btn-cart-remove">
              ✕
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  posCartBody.innerHTML = rowsHtml;
  posCartCountSpan.textContent = String(posCart.length);
  posCartTotalSpan.textContent = total.toFixed(2);
}

if (posProductSelect) {
  posProductSelect.addEventListener("change", () => {
    const productId = posProductSelect.value;
    posItemMessage.textContent = "";
    posItemMessage.classList.remove("error", "success");

    if (!productId) {
      posVariantSelect.innerHTML =
        '<option value="">Selecciona primero un producto...</option>';
      posVariantSelect.disabled = true;
      posUnitPriceInput.value = "";
      posStockInfo.textContent = "";
      return;
    }

    updateVariantOptionsForProduct(productId);
  });
}

if (posVariantSelect) {
  posVariantSelect.addEventListener("change", () => {
    updatePOSVariantInfo();
  });
}

if (posItemForm) {
  posItemForm.addEventListener("submit", (e) => {
    e.preventDefault();

    posItemMessage.textContent = "";
    posItemMessage.classList.remove("error", "success");

    const productId = posProductSelect.value;
    const idVariante = posVariantSelect.value;
    const quantityStr = posQuantityInput.value.trim();

    if (!productId) {
      posItemMessage.textContent = "Selecciona un producto.";
      posItemMessage.classList.add("error");
      return;
    }
    if (!idVariante) {
      posItemMessage.textContent = "Selecciona una variante.";
      posItemMessage.classList.add("error");
      return;
    }

    const qty = parseInt(quantityStr, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      posItemMessage.textContent = "La cantidad no es válida.";
      posItemMessage.classList.add("error");
      return;
    }

    const variant = getVariantById(idVariante);
    const product = allProducts.find(
      (p) => Number(p.id_producto) === Number(productId)
    );

    if (!variant || !product) {
      posItemMessage.textContent =
        "No se encontró la información de la variante o producto.";
      posItemMessage.classList.add("error");
      return;
    }

    const availableStock = variant.stock != null ? variant.stock : 0;
    const alreadyInCart = getCartQuantityForVariant(idVariante);

    if (availableStock > 0 && alreadyInCart + qty > availableStock) {
      posItemMessage.textContent = `No hay stock suficiente. Stock disponible: ${availableStock}, ya en carrito: ${alreadyInCart}.`;
      posItemMessage.classList.add("error");
      return;
    }

    const price = variant.precio != null ? Number(variant.precio) : 0;

    posCart.push({
      id_variante: variant.id_variante,
      producto: product.nombre,
      talla: variant.talla || "-",
      color: variant.color || "-",
      sku: variant.sku || "",
      precio: price,
      cantidad: qty,
    });

    renderCart();
    posItemMessage.textContent = "Producto agregado al carrito.";
    posItemMessage.classList.add("success");
    posQuantityInput.value = "1";
  });
}

if (posCartBody) {
  posCartBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-cart-remove");
    if (!btn) return;

    const row = btn.closest("tr");
    const index = row ? row.getAttribute("data-index") : null;
    if (index == null) return;

    posCart.splice(Number(index), 1);
    renderCart();
  });
}

// --- Recibo ---

function renderReceipt() {
  if (!lastReceipt || !receiptPanel) return;

  receiptIdSpan.textContent = lastReceipt.id_venta || "N/D";
  receiptDateSpan.textContent = lastReceipt.fecha;
  receiptCustomerSpan.textContent =
    lastReceipt.cliente || "Consumidor final";
  receiptPaymentSpan.textContent = lastReceipt.metodo_pago || "-";
  receiptTotalSpan.textContent = lastReceipt.total.toFixed(2);

  const rows = lastReceipt.items
    .map((item) => {
      const subtotal = item.cantidad * item.precio;
      return `
        <tr>
          <td>${item.producto}</td>
          <td>${item.talla}</td>
          <td>${item.color}</td>
          <td>${item.sku}</td>
          <td>${item.cantidad}</td>
          <td>${item.precio.toFixed(2)}</td>
          <td>${subtotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  receiptItemsBody.innerHTML = rows;
  receiptPanel.classList.remove("hidden");
}

if (receiptPrintBtn) {
  receiptPrintBtn.addEventListener("click", () => {
    window.print();
  });
}

if (posConfirmBtn) {
  posConfirmBtn.addEventListener("click", async () => {
    posCartMessage.textContent = "";
    posCartMessage.classList.remove("error", "success");

    if (posCart.length === 0) {
      posCartMessage.textContent = "El carrito está vacío.";
      posCartMessage.classList.add("error");
      return;
    }

    const metodoPago = posPaymentSelect.value;
    const cliente = posCustomerInput.value.trim();

    if (!metodoPago) {
      posCartMessage.textContent = "Selecciona un método de pago.";
      posCartMessage.classList.add("error");
      return;
    }

    const session = loadSession();
    if (!session || !session.token) {
      posCartMessage.textContent =
        "Sesión no válida. Vuelve a iniciar sesión.";
      posCartMessage.classList.add("error");
      return;
    }

    const cartSnapshot = posCart.map((item) => ({ ...item }));
    const total = cartSnapshot.reduce(
      (sum, i) => sum + i.precio * i.cantidad,
      0
    );

    const payload = {
      metodo_pago: metodoPago,
      cliente: cliente || null,
      items: cartSnapshot.map((item) => ({
        id_variante: item.id_variante,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
      })),
    };

    try {
      const response = await fetch(SALES_ENDPOINT, {
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
          "No se pudo registrar la venta.";
        posCartMessage.textContent = msg;
        posCartMessage.classList.add("error");
        return;
      }

      const data = await response.json();

      const nowStr = new Date().toLocaleString("es-PA");
      const saleId =
        data.id_venta || data.id || data.idVenta || data.id_venta_pk || null;
      const saleDate = data.fecha || data.fecha_venta || nowStr;

      lastReceipt = {
        id_venta: saleId,
        fecha: saleDate,
        cliente: cliente || "Consumidor final",
        metodo_pago: metodoPago,
        total,
        items: cartSnapshot,
      };

      renderReceipt();

      posCartMessage.textContent = "Venta registrada correctamente.";
      posCartMessage.classList.add("success");

      // Limpiar carrito y refrescar datos de stock
      posCart = [];
      renderCart();
      posCustomerInput.value = "";
      posPaymentSelect.value = "";

      posInitialized = false;
      await initPOS();

      const sessionAgain = loadSession();
      if (sessionAgain && sessionAgain.token) {
        loadProductos(sessionAgain.token);
      }
    } catch (error) {
      console.error("Error registrando venta:", error);
      posCartMessage.textContent =
        "Error al conectar con el servidor para registrar la venta.";
      posCartMessage.classList.add("error");
    }
  });
}

// === CREACIÓN DE USUARIOS INTERNOS (solo Admin) ===

async function crearUsuarioInterno(nombreUsuario, password, rol) {
  const session = loadSession();
  if (!session || !session.token) {
    throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
  }

  const response = await fetch(`${API_URL}/usuario/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      nombre_usuario: nombreUsuario,
      password,
      rol,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      errorData.mensaje ||
      errorData.error ||
      "No se pudo crear el usuario interno.";
    throw new Error(msg);
  }

  return await response.json();
}

if (userForm) {
  console.log("✅ userForm encontrado, agregando listener de submit");

  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    console.log("🚀 Submit de user-form disparado");

    userFormMessage.textContent = "";
    userFormMessage.classList.remove("error", "success");

    // Tomar los elementos de forma segura
    const nameEl = document.getElementById("user-name");
    const passEl = document.getElementById("user-password");
    const roleEl = document.getElementById("user-role-select");

    // Si alguno es null, se convierte en cadena vacía y NO revienta
    const nombreUsuario =
      nameEl && typeof nameEl.value === "string"
        ? nameEl.value.trim()
        : "";
    const password =
      passEl && typeof passEl.value === "string"
        ? passEl.value.trim()
        : "";
    const rol =
      roleEl && typeof roleEl.value === "string"
        ? roleEl.value.trim()
        : "";

    console.log("Datos capturados:", { nombreUsuario, password, rol });

    if (!nombreUsuario || !password || !rol) {
      userFormMessage.textContent = "Completa todos los campos obligatorios.";
      userFormMessage.classList.add("error");
      return;
    }

    try {
      const data = await crearUsuarioInterno(nombreUsuario, password, rol);
      console.log("✅ Usuario creado:", data);

      userFormMessage.textContent = "Usuario creado correctamente.";
      userFormMessage.classList.add("success");
      userForm.reset();
    } catch (error) {
      console.error("❌ Error creando usuario interno:", error);
      userFormMessage.textContent = error.message;
      userFormMessage.classList.add("error");
    }
  });
} else {
  console.log("⚠️ userForm NO encontrado en el DOM");
}
