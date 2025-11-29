// tienda.js - Módulo de E-commerce (catálogo público + carrito + pedidos)

const API_URL = "http://localhost:4000/api";

// DOM catálogo
const catalogGrid = document.getElementById("catalog-grid");
const catalogMessage = document.getElementById("catalog-message");

// DOM cuenta cliente
const clientStatus = document.getElementById("client-status");
const btnTabLogin = document.getElementById("btn-tab-login");
const btnTabRegister = document.getElementById("btn-tab-register");
const clientLoginForm = document.getElementById("client-login-form");
const clientRegisterForm = document.getElementById("client-register-form");
const clientLogoutBtn = document.getElementById("client-logout-btn");
const clientLoginMessage = document.getElementById("client-login-message");
const clientRegisterMessage = document.getElementById("client-register-message");

// DOM carrito / pedido
const cartBody = document.getElementById("cart-body");
const cartCountSpan = document.getElementById("cart-count");
const cartTotalSpan = document.getElementById("cart-total");
const orderForm = document.getElementById("order-form");
const orderAddressInput = document.getElementById("order-address");
const orderPaymentSelect = document.getElementById("order-payment");
const orderMessage = document.getElementById("order-message");

// 🔹 Nuevo: badge pequeño en el icono del carrito
const cartCountBadge = document.getElementById("cart-count-badge");

// Estado global
let allProducts = [];
let allVariants = [];
let cart = [];
let clientSession = null;

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
    cartTotalSpan.textContent = "0.00";
    if (cartCountBadge) cartCountBadge.textContent = "0";
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
  if (cartCountBadge) {
    cartCountBadge.textContent = String(cart.length);
  }
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
  }
}

function renderCatalog() {
  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    catalogGrid.innerHTML = "";
    catalogMessage.textContent = "No hay productos disponibles.";
    return;
  }

  const cardsHtml = allProducts
    .map((p) => {
      // Variantes con stock > 0
      const variantsForProduct = allVariants.filter(
        (v) =>
          Number(v.id_producto) === Number(p.id_producto) &&
          (v.stock == null || v.stock > 0)
      );

      // RF-4.2: Solo mostrar productos con stock disponible
      if (variantsForProduct.length === 0) {
        return "";
      }

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

  catalogGrid.innerHTML = cardsHtml || "";
}

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
    } catch (e) {
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

  const items = cart.map((item) => ({
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

document.addEventListener("DOMContentLoaded", () => {
  switchAuthTab("login");
  loadClientSession();
  loadCart();
  loadCatalog();

  // 🔹 Dropdowns (abrir/cerrar con click)
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

  dropdownToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const parent = btn.closest(".dropdown");
      if (!parent) return;
      parent.classList.toggle("is-open");
    });
  });

  // Cerrar dropdowns al hacer click fuera
  document.addEventListener("click", (e) => {
    dropdownToggles.forEach((btn) => {
      const parent = btn.closest(".dropdown");
      if (!parent) return;
      if (!parent.contains(e.target)) {
        parent.classList.remove("is-open");
      }
    });
  });
});
