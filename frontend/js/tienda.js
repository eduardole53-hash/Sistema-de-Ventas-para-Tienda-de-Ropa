// tienda.js - Módulo de E-commerce (catálogo público + carrito + pedidos)

const API_URL = "http://localhost:4000/api";

// DOM catálogo
const catalogGrid = document.getElementById("catalog-grid");
const catalogMessage = document.getElementById("catalog-message");
const catalogCountSpan = document.getElementById("catalog-count");
const catalogSection = document.getElementById("catalogo");
const catalogTabs = document.querySelectorAll(".catalog-tab");
const categoryBanners = document.querySelectorAll(".js-category-filter");

// DOM cuenta cliente
const clientStatus = document.getElementById("client-status");
const btnTabLogin = document.getElementById("btn-tab-login");
const btnTabRegister = document.getElementById("btn-tab-register");
const clientLoginForm = document.getElementById("client-login-form");
const clientRegisterForm = document.getElementById("client-register-form");
const clientLogoutBtn = document.getElementById("client-logout-btn");
const clientLoginMessage = document.getElementById("client-login-message");
const clientRegisterMessage = document.getElementById(
  "client-register-message"
);

// DOM carrito / pedido
const cartBody = document.getElementById("cart-body");
const cartCountSpan = document.getElementById("cart-count");
const cartCountBadge = document.getElementById("cart-count-badge");
const cartTotalSpan = document.getElementById("cart-total");
const orderForm = document.getElementById("order-form");
const orderAddressInput = document.getElementById("order-address");
const orderPaymentSelect = document.getElementById("order-payment");
const orderMessage = document.getElementById("order-message");

// --- DOM Recibo e-commerce ---
const ecomReceiptModal = document.getElementById("ecom-receipt-modal");
const ecomReceiptIdSpan = document.getElementById("ecom-receipt-id");
const ecomReceiptDateSpan = document.getElementById("ecom-receipt-date");
const ecomReceiptCustomerSpan = document.getElementById("ecom-receipt-customer");
const ecomReceiptPaymentSpan = document.getElementById("ecom-receipt-payment");
const ecomReceiptItemsBody = document.getElementById("ecom-receipt-items-body");
const ecomReceiptTotalSpan = document.getElementById("ecom-receipt-total");
const ecomReceiptPrintBtn = document.getElementById("ecom-receipt-print-btn");
const ecomReceiptCloseBtn = document.getElementById("ecom-receipt-close-btn");

// Estado del recibo
let lastEcomReceipt = null;


// Estado global
let allProducts = [];
let allVariants = [];
let cart = [];
let clientSession = null;
let currentCategoryFilter = "all";

// --- Helpers generales ---

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function productMatchesCategory(product, categoryFilter) {
  if (!categoryFilter || categoryFilter === "all") return true;

  const filterNorm = normalizeText(categoryFilter);
  const catNorm = normalizeText(product.categoria);
  const nameNorm = normalizeText(product.nombre);

  // 🔹 Alias / sinónimos por categoría
  const aliases = {
    // Camisetas: blusas, t-shirt, sweaters, etc.
    camisetas: [
      "camiseta",
      "camisetas",
      "blusa",
      "blusas",
      "t shirt",
      "t-shirt",
      "playera",
      "sueter",
      "sweater",
      "top"
    ],

    // Chaquetas y chalecos
    "chaquetas y chalecos": [
      "chaqueta",
      "chaquetas",
      "chaleco",
      "chalecos",
      "jacket"
    ],

    // Accesorios (antes Básicos)
    accesorios: [
      "accesorio",
      "accesorios",
      "correa",
      "correas",
      "pulsera",
      "pulseras",
      "cartera",
      "carteras",
      "anillo",
      "anillos",
      "collar",
      "collares",
      "perfume",
      "perfumes",
      "arete",
      "aretes",
      "reloj",
      "relojes",
      "lente",
      "lentes",
      "gorra",
      "gorras",
      "sombrero",
      "sombreros"
    ],

    // Zapatos (antes Camisas)
    zapatos: [
      "zapatilla",
      "zapatillas",
      "sandalia",
      "sandalias",
      "zapato",
      "zapatos",
      "chancleta",
      "chancletas",
      "tacon",
      "tacones"
    ],

    // Faldas
    faldas: ["falda", "faldas"]
  };

  // Si el filtro tiene alias definidos (por ejemplo "Camisetas", "Accesorios", "Zapatos", "Faldas")
  const aliasList = aliases[filterNorm];
  if (aliasList) {
    const matchAlias = aliasList.some((word) => {
      const w = normalizeText(word);
      return catNorm.includes(w) || nameNorm.includes(w);
    });
    if (matchAlias) return true;
  }

  // Caso general: buscar la palabra del filtro tal cual en categoría o nombre
  return catNorm.includes(filterNorm) || nameNorm.includes(filterNorm);
}



// --- Helpers de sesión cliente ---

function saveClientSession(token, nombre, email) {
  const data = { token, nombre, email };
  clientSession = data;
  localStorage.setItem("sv_ecom_cliente", JSON.stringify(data));
  updateAuthUI();
}

function loadClientSession() {
  const raw = localStorage.getItem("sv_ecom_cliente");
  if (!raw) return null;
  try {
    clientSession = JSON.parse(raw);
  } catch (e) {
    clientSession = null;
  }
  updateAuthUI();
  return clientSession;
}

function clearClientSession() {
  clientSession = null;
  localStorage.removeItem("sv_ecom_cliente");
  updateAuthUI();
}

function updateAuthUI() {
  if (clientSession && clientSession.token) {
    clientStatus.textContent = `Sesión iniciada como: ${clientSession.nombre}`;
    clientLogoutBtn.classList.remove("hidden");
  } else {
    clientStatus.textContent = "No has iniciado sesión.";
    clientLogoutBtn.classList.add("hidden");
  }
}

// --- Helpers de carrito ---

function saveCart() {
  localStorage.setItem("sv_ecom_cart", JSON.stringify(cart));
}

function loadCart() {
  const raw = localStorage.getItem("sv_ecom_cart");
  if (!raw) return;
  try {
    cart = JSON.parse(raw) || [];
  } catch (e) {
    cart = [];
  }
  renderCart();
}

function getVariantById(idVariante) {
  return allVariants.find(
    (v) => Number(v.id_variante) === Number(idVariante)
  );
}

function renderCart() {
  if (cart.length === 0) {
    cartBody.innerHTML = "";
    cartCountSpan.textContent = "0";
    if (cartCountBadge) cartCountBadge.textContent = "0";
    cartTotalSpan.textContent = "0.00";
    saveCart();
    return;
  }

  let total = 0;

  const rowsHtml = cart
    .map((item, index) => {
      const subtotal = item.cantidad * item.precio;
      total += subtotal;
      return `
        <tr data-index="${index}">
          <td>${item.producto}</td>
          <td>${item.talla} / ${item.color}</td>
          <td>${item.cantidad}</td>
          <td>${subtotal.toFixed(2)}</td>
          <td>
            <button class="btn btn-outline btn-small btn-cart-remove">✕</button>
          </td>
        </tr>
      `;
    })
    .join("");

  cartBody.innerHTML = rowsHtml;
  cartCountSpan.textContent = String(cart.length);
  if (cartCountBadge) cartCountBadge.textContent = String(cart.length);
  cartTotalSpan.textContent = total.toFixed(2);

  saveCart();
}

// --- Tabs login / registro ---

function switchAuthTab(tab) {
  if (tab === "login") {
    clientLoginForm.classList.remove("hidden");
    clientRegisterForm.classList.add("hidden");
    btnTabLogin.classList.remove("btn-outline");
    btnTabLogin.classList.add("btn-secondary");
    btnTabRegister.classList.remove("btn-secondary");
    btnTabRegister.classList.add("btn-outline");
  } else {
    clientLoginForm.classList.add("hidden");
    clientRegisterForm.classList.remove("hidden");
    btnTabLogin.classList.remove("btn-secondary");
    btnTabLogin.classList.add("btn-outline");
    btnTabRegister.classList.remove("btn-outline");
    btnTabRegister.classList.add("btn-secondary");
  }

  clientLoginMessage.textContent = "";
  clientRegisterMessage.textContent = "";
}

btnTabLogin.addEventListener("click", () => switchAuthTab("login"));
btnTabRegister.addEventListener("click", () => switchAuthTab("register"));

// --- Cargar catálogo (productos + variantes) ---

async function loadCatalog() {
  catalogMessage.textContent = "";
  catalogMessage.classList.remove("error", "success");
  catalogGrid.innerHTML = "<p>Cargando catálogo...</p>";

  try {
    const [prodRes, varRes] = await Promise.all([
      fetch(`${API_URL}/productos`),
      fetch(`${API_URL}/variantes`),
    ]);

    if (!prodRes.ok || !varRes.ok) {
      throw new Error("No se pudo cargar el catálogo.");
    }

    allProducts = await prodRes.json();
    allVariants = await varRes.json();

    renderCatalog();
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    catalogMessage.textContent =
      "Error al cargar el catálogo. Verifica que el backend esté activo.";
    catalogMessage.classList.add("error");
    catalogGrid.innerHTML = "";
    if (catalogCountSpan) catalogCountSpan.textContent = "0 productos";
  }
}

function renderCatalog() {
  catalogMessage.textContent = "";
  catalogMessage.classList.remove("error", "success");

  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    catalogGrid.innerHTML = "";
    catalogMessage.textContent = "No hay productos disponibles.";
    if (catalogCountSpan) {
      catalogCountSpan.textContent = "0 productos";
    }
    return;
  }

  let visibleCount = 0;

  const cardsHtml = allProducts
    .map((p) => {
      // Variantes con stock > 0
      const variantsForProduct = allVariants.filter(
        (v) =>
          Number(v.id_producto) === Number(p.id_producto) &&
          (v.stock == null || v.stock > 0)
      );

      // Solo productos con stock
      if (variantsForProduct.length === 0) {
        return "";
      }

      // Filtro por categoría
      if (!productMatchesCategory(p, currentCategoryFilter)) {
        return "";
      }

      visibleCount++;

      const minPrice = Math.min(
        ...variantsForProduct.map((v) =>
          Number(v.precio != null ? v.precio : 0)
        )
      );

      const img =
        p.imagen_url ||
        "https://via.placeholder.com/400x300?text=Sin+imagen";

      const safeName = String(p.nombre || "").replace(/"/g, "&quot;");

      const optionsHtml =
        `<option value="">Selecciona talla / color...</option>` +
        variantsForProduct
          .map((v) => {
            const price = Number(v.precio || 0).toFixed(2);
            const stockText =
              v.stock != null ? `Stock: ${v.stock}` : "Stock disponible";
            return `<option value="${v.id_variante}">
              ${v.talla || "-"} / ${v.color || "-"} - B/. ${price} (${stockText})
            </option>`;
          })
          .join("");

      return `
        <article class="product-card" data-product-id="${p.id_producto}">
          <div class="product-card-image">
            <img src="${img}" alt="${safeName}" />
          </div>
          <div class="product-card-body">
            <h3>${p.nombre}</h3>
            <p class="product-price">Desde B/. ${minPrice.toFixed(2)}</p>
            <p class="product-description">${p.descripcion || ""}</p>

            <div class="form-group mt-2">
              <label>Variante (talla / color)</label>
              <select class="product-variant-select">
                ${optionsHtml}
              </select>
            </div>

            <div class="form-row product-card-actions">
              <div class="form-group">
                <label>Cant.</label>
                <input
                  type="number"
                  class="product-qty-input"
                  min="1"
                  value="1"
                />
              </div>
              <button class="btn btn-primary btn-add-cart">
                Agregar al carrito
              </button>
            </div>

            <p class="form-message product-stock-msg"></p>
          </div>
        </article>
      `;
    })
    .join("");

  if (visibleCount === 0) {
    catalogGrid.innerHTML = "";
    catalogMessage.textContent =
      "No se encontraron productos para este filtro.";
    if (catalogCountSpan) catalogCountSpan.textContent = "0 productos";
  } else {
    catalogGrid.innerHTML = cardsHtml || "";
    if (catalogCountSpan) {
      const label =
        visibleCount === 1 ? "1 producto" : `${visibleCount} productos`;
      catalogCountSpan.textContent = label;
    }
  }
}

// --- Filtros de categoría (tabs + banners) ---

function setActiveTab(category) {
  catalogTabs.forEach((tab) => {
    const tabCat = tab.dataset.category || "all";
    if (tabCat === category) {
      tab.classList.add("catalog-tab-active");
    } else {
      tab.classList.remove("catalog-tab-active");
    }
  });
}

catalogTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.category || "all";
    currentCategoryFilter = category;
    setActiveTab(category);
    renderCatalog();
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

categoryBanners.forEach((banner) => {
  banner.addEventListener("click", () => {
    const category = banner.dataset.category || "all";
    currentCategoryFilter = category;
    setActiveTab(category);
    renderCatalog();
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// --- Manejo de clicks en el catálogo (agregar al carrito) ---

catalogGrid.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".btn-add-cart");
  if (!addBtn) return;

  const card = addBtn.closest(".product-card");
  if (!card) return;

  const variantSelect = card.querySelector(".product-variant-select");
  const qtyInput = card.querySelector(".product-qty-input");
  const stockMsg = card.querySelector(".product-stock-msg");

  stockMsg.textContent = "";
  stockMsg.classList.remove("error", "success");

  const idVariante = variantSelect.value;
  if (!idVariante) {
    stockMsg.textContent = "Selecciona una talla/color.";
    stockMsg.classList.add("error");
    return;
  }

  const qty = parseInt(qtyInput.value.trim(), 10);
  if (Number.isNaN(qty) || qty <= 0) {
    stockMsg.textContent = "Cantidad no válida.";
    stockMsg.classList.add("error");
    return;
  }

  const variant = getVariantById(idVariante);
  if (!variant) {
    stockMsg.textContent = "Variante no encontrada.";
    stockMsg.classList.add("error");
    return;
  }

  const product = allProducts.find(
    (p) => Number(p.id_producto) === Number(card.dataset.productId)
  );
  if (!product) {
    stockMsg.textContent = "Producto no encontrado.";
    stockMsg.classList.add("error");
    return;
  }

  const availableStock = variant.stock != null ? variant.stock : null;
  const alreadyInCart = cart
    .filter((i) => Number(i.id_variante) === Number(idVariante))
    .reduce((sum, i) => sum + i.cantidad, 0);

  if (
    availableStock != null &&
    availableStock > 0 &&
    alreadyInCart + qty > availableStock
  ) {
    stockMsg.textContent = `No hay stock suficiente. Disponible: ${availableStock}, ya en carrito: ${alreadyInCart}.`;
    stockMsg.classList.add("error");
    return;
  }

  const price = Number(variant.precio || 0);

  cart.push({
    id_variante: variant.id_variante,
    producto: product.nombre,
    talla: variant.talla || "-",
    color: variant.color || "-",
    precio: price,
    cantidad: qty,
  });

  renderCart();
  stockMsg.textContent = "Producto agregado al carrito.";
  stockMsg.classList.add("success");
});

// Eliminar del carrito
cartBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-cart-remove");
  if (!btn) return;

  const row = btn.closest("tr");
  const index = row ? row.getAttribute("data-index") : null;
  if (index == null) return;

  cart.splice(Number(index), 1);
  renderCart();
});

// --- Login de cliente ---

clientLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clientLoginMessage.textContent = "";
  clientLoginMessage.classList.remove("error", "success");

  const email = document
    .getElementById("client-login-email")
    .value.trim();
  const password = document
    .getElementById("client-login-password")
    .value.trim();

  if (!email || !password) {
    clientLoginMessage.textContent =
      "Completa correo y contraseña.";
    clientLoginMessage.classList.add("error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/clientes/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudo iniciar sesión.";
      clientLoginMessage.textContent = msg;
      clientLoginMessage.classList.add("error");
      return;
    }

    const data = await response.json();
    const token = data.token;

    if (!token) {
      clientLoginMessage.textContent = "Token no recibido.";
      clientLoginMessage.classList.add("error");
      return;
    }

    // Intentar leer nombre desde el token, si viene
    let nombre = email;
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      nombre = payload.nombre_completo || nombre;
    } catch (e2) {
      // ignorar
    }

    saveClientSession(token, nombre, email);
    clientLoginMessage.textContent = "Sesión iniciada correctamente.";
    clientLoginMessage.classList.add("success");
    clientLoginForm.reset();
  } catch (error) {
    console.error("Error en login de cliente:", error);
    clientLoginMessage.textContent =
      "Error al conectar con el servidor.";
    clientLoginMessage.classList.add("error");
  }
});

// --- Registro de cliente ---

clientRegisterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clientRegisterMessage.textContent = "";
  clientRegisterMessage.classList.remove("error", "success");

  const nombre = document
    .getElementById("client-register-name")
    .value.trim();
  const email = document
    .getElementById("client-register-email")
    .value.trim();
  const password = document
    .getElementById("client-register-password")
    .value.trim();

  if (!nombre || !email || !password) {
    clientRegisterMessage.textContent =
      "Completa nombre, correo y contraseña.";
    clientRegisterMessage.classList.add("error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/clientes/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_completo: nombre, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudo registrar la cuenta.";
      clientRegisterMessage.textContent = msg;
      clientRegisterMessage.classList.add("error");
      return;
    }

    clientRegisterMessage.textContent =
      "Cuenta creada correctamente. Ahora puedes iniciar sesión.";
    clientRegisterMessage.classList.add("success");
    clientRegisterForm.reset();
    switchAuthTab("login");
  } catch (error) {
    console.error("Error en registro de cliente:", error);
    clientRegisterMessage.textContent =
      "Error al conectar con el servidor.";
    clientRegisterMessage.classList.add("error");
  }
});

// --- Cerrar sesión cliente ---

clientLogoutBtn.addEventListener("click", () => {
  clearClientSession();
});

function openEcomReceiptModal() {
  if (ecomReceiptModal) {
    ecomReceiptModal.classList.remove("hidden");
  }
}

function closeEcomReceiptModal() {
  if (ecomReceiptModal) {
    ecomReceiptModal.classList.add("hidden");
  }
}

function renderEcomReceipt() {
  if (!lastEcomReceipt) return;

  const r = lastEcomReceipt;

  ecomReceiptIdSpan.textContent = r.id_pedido || "N/D";
  ecomReceiptDateSpan.textContent = r.fecha || "-";
  ecomReceiptCustomerSpan.textContent = r.cliente || "Cliente";
  ecomReceiptPaymentSpan.textContent = r.metodo_pago || "-";
  ecomReceiptTotalSpan.textContent = r.total.toFixed(2);

  const rows = r.items
    .map((item) => {
      const subtotal = item.cantidad * item.precio;
      return `
        <tr>
          <td>${item.producto}</td>
          <td>${item.talla}</td>
          <td>${item.color}</td>
          <td>${item.cantidad}</td>
          <td>${item.precio.toFixed(2)}</td>
          <td>${subtotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  ecomReceiptItemsBody.innerHTML = rows;

  openEcomReceiptModal();
}

// Eventos de los botones del modal
if (ecomReceiptCloseBtn) {
  ecomReceiptCloseBtn.addEventListener("click", () => {
    closeEcomReceiptModal();
  });
}

if (ecomReceiptPrintBtn) {
  ecomReceiptPrintBtn.addEventListener("click", () => {
    const receiptPanel = document.getElementById("ecom-receipt-panel");
    if (!receiptPanel) return;

    const printContents = receiptPanel.innerHTML;

    // Abrimos una nueva ventana solo para el recibo
    const printWindow = window.open("", "_blank", "width=600,height=800");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Recibo de compra</title>
        <link rel="stylesheet" href="css/styles.css" />
        <style>
          body {
            background: #ffffff;
            padding: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="receipt-panel">
          ${printContents}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    // Opcional: cerrar la ventana después de imprimir
    printWindow.close();
  });
}


// --- Realizar pedido (RF-4.4) ---

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  orderMessage.textContent = "";
  orderMessage.classList.remove("error", "success");

  if (cart.length === 0) {
    orderMessage.textContent = "Tu carrito está vacío.";
    orderMessage.classList.add("error");
    return;
  }

  if (!clientSession || !clientSession.token) {
    orderMessage.textContent =
      "Debes iniciar sesión para realizar un pedido.";
    orderMessage.classList.add("error");
    return;
  }

  const metodo_pago = orderPaymentSelect.value;
  const direccion_envio = orderAddressInput.value.trim() || null;

  if (!metodo_pago) {
    orderMessage.textContent = "Selecciona un método de pago.";
    orderMessage.classList.add("error");
    return;
  }

  // Hacemos una copia del carrito antes de limpiarlo, para el recibo
  const cartSnapshot = cart.map((item) => ({ ...item }));
  const total = cartSnapshot.reduce(
    (sum, i) => sum + i.precio * i.cantidad,
    0
  );

  const items = cartSnapshot.map((item) => ({
    id_variante: item.id_variante,
    cantidad: item.cantidad,
  }));

  try {
    const response = await fetch(`${API_URL}/pedidos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientSession.token}`,
      },
      body: JSON.stringify({ metodo_pago, direccion_envio, items }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData.mensaje ||
        errorData.error ||
        "No se pudo registrar el pedido.";
      orderMessage.textContent = msg;
      orderMessage.classList.add("error");
      return;
    }

    const data = await response.json();
    console.log("Pedido registrado:", data);

    const nowStr = new Date().toLocaleString("es-PA");
    const orderId =
      data.id_pedido ||
      data.id ||
      data.idPedido ||
      data.id_pedido_pk ||
      null;
    const fechaPedido = data.fecha || data.fecha_pedido || nowStr;

    // Guardamos los datos del recibo para mostrar en el modal
    lastEcomReceipt = {
      id_pedido: orderId,
      fecha: fechaPedido,
      cliente: clientSession?.nombre || clientSession?.email || "Cliente",
      metodo_pago,
      total,
      items: cartSnapshot,
    };

    renderEcomReceipt();

    orderMessage.textContent =
      "Pedido registrado correctamente. ¡Gracias por tu compra!";
    orderMessage.classList.add("success");

    // Limpiar carrito
    cart = [];
    renderCart();
    orderForm.reset();

    // Recargar catálogo para actualizar stock disponible
    loadCatalog();
  } catch (error) {
    console.error("Error creando pedido:", error);
    orderMessage.textContent =
      "Error al conectar con el servidor para registrar el pedido.";
    orderMessage.classList.add("error");
  }
});


// --- Inicio ---

// --- Inicio ---

document.addEventListener("DOMContentLoaded", () => {
  switchAuthTab("login");
  loadClientSession();
  loadCart();
  loadCatalog();

  // -----------------------------
  // Toggle de paneles: Mi cuenta / Mi carrito
  // -----------------------------
  const accountDropdown = document.getElementById("account-dropdown");
  const cartDropdown = document.getElementById("cart-dropdown");

  function closeAllDropdowns() {
    [accountDropdown, cartDropdown].forEach((el) => {
      if (el) el.classList.remove("is-open");
    });
  }

  // Mi cuenta
  if (accountDropdown) {
    const accountBtn = accountDropdown.querySelector(".dropdown-toggle");
    const accountPanel = accountDropdown.querySelector(".dropdown-panel");

    if (accountBtn) {
      accountBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // evita que se cierre por el click global
        const isOpen = accountDropdown.classList.contains("is-open");
        closeAllDropdowns();
        if (!isOpen) accountDropdown.classList.add("is-open");
      });
    }

    if (accountPanel) {
      // Para poder hacer click dentro del panel sin que se cierre
      accountPanel.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  }

  // Mi carrito
  if (cartDropdown) {
    const cartBtn = cartDropdown.querySelector(".dropdown-toggle");
    const cartPanel = cartDropdown.querySelector(".dropdown-panel");

    if (cartBtn) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = cartDropdown.classList.contains("is-open");
        closeAllDropdowns();
        if (!isOpen) cartDropdown.classList.add("is-open");
      });
    }

    if (cartPanel) {
      cartPanel.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
  }

  // Cerrar paneles al hacer click fuera
  document.addEventListener("click", () => {
    closeAllDropdowns();
  });
});

