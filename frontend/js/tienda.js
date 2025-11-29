// tienda.js - Módulo de E-commerce (catálogo público + carrito + pedidos)

const API_URL = "http://localhost:4000/api";

// DOM catálogo
const catalogGrid = document.getElementById("catalog-grid");
const catalogMessage = document.getElementById("catalog-message");
const catalogSearchInput = document.getElementById("catalog-search");
const filterCategorySelect = document.getElementById("filter-category");
const filterSizeSelect = document.getElementById("filter-size");
const filterColorSelect = document.getElementById("filter-color");
const filterPriceSelect = document.getElementById("filter-price");
const catalogPagination = document.getElementById("catalog-pagination");

// Modal variantes
const variantModal = document.getElementById("variant-modal");
const variantModalBody = document.getElementById("variant-modal-body");
const variantModalClose = document.getElementById("variant-modal-close");

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

// DOM carrito
const cartBody = document.getElementById("cart-body");
const cartCountSpan = document.getElementById("cart-count");
const cartTotalSpan = document.getElementById("cart-total");
const cartMessage = document.getElementById("cart-message");

// DOM pedido
const orderForm = document.getElementById("order-form");
const orderAddressInput = document.getElementById("order-address");
const orderPaymentSelect = document.getElementById("order-payment");
const orderMessage = document.getElementById("order-message");

// --- Estado global ---
let allProducts = [];
let allVariants = [];
let cart = [];

// Filtros / paginación catálogo
let currentSearch = "";
let currentCategory = "todas";
let currentSize = "todas";
let currentColor = "todos";
let currentPrice = "todas";
let currentPage = 1;
const PAGE_SIZE = 8;

let clientSession = null;

// --- Helpers de sesión cliente ---

function saveClientSession(token, nombre, email) {
  const data = { token, nombre, email };
  clientSession = data;
  localStorage.setItem("mb_client_session", JSON.stringify(data));
  updateClientStatus();
}

function loadClientSession() {
  const stored = localStorage.getItem("mb_client_session");
  if (!stored) return;
  try {
    const data = JSON.parse(stored);
    clientSession = data;
    updateClientStatus();
  } catch (error) {
    console.error("Error cargando sesión de cliente:", error);
  }
}

function clearClientSession() {
  clientSession = null;
  localStorage.removeItem("mb_client_session");
  updateClientStatus();
}

// Actualiza el recuadro "Mi cuenta"
function updateClientStatus() {
  if (!clientStatus) return;

  if (!clientSession) {
    clientStatus.innerHTML = `
      <p>No has iniciado sesión.</p>
      <p>Inicia sesión o regístrate para realizar tus compras.</p>
    `;
    clientLogoutBtn.classList.add("hidden");
    return;
  }

  clientStatus.innerHTML = `
    <p><strong>Cliente:</strong> ${clientSession.nombre}</p>
    <p><small>${clientSession.email}</small></p>
  `;
  clientLogoutBtn.classList.remove("hidden");
}

// --- Helpers carrito (localStorage) ---

function saveCart() {
  localStorage.setItem("mb_cart", JSON.stringify(cart));
}

function loadCart() {
  const stored = localStorage.getItem("mb_cart");
  if (!stored) {
    renderCart();
    return;
  }
  try {
    cart = JSON.parse(stored) || [];
  } catch (error) {
    cart = [];
  }
  renderCart();
}

// --- Listeners tabs login/registro ---

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

    initializeFilters();
    renderCatalog();
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    catalogMessage.textContent =
      "Error al cargar el catálogo. Verifica que el backend esté activo.";
    catalogMessage.classList.add("error");
    catalogGrid.innerHTML = "";
  }
}

function initializeFilters() {
  if (
    !filterCategorySelect ||
    !filterSizeSelect ||
    !filterColorSelect ||
    !filterPriceSelect
  ) {
    return;
  }

  // Categorías desde productos
  const categories = Array.from(
    new Set(
      (allProducts || [])
        .map((p) => p.categoria)
        .filter((c) => c && c.trim() !== "")
    )
  ).sort();

  filterCategorySelect.innerHTML =
    `<option value="todas">Todas las categorías</option>` +
    categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");

  // Variantes válidas (con stock)
  const validVariants = (allVariants || []).filter(
    (v) => v.stock == null || v.stock > 0
  );

  // Tallas
  const sizes = Array.from(
    new Set(
      validVariants
        .map((v) => v.talla)
        .filter((t) => t && t.trim() !== "")
    )
  ).sort();

  filterSizeSelect.innerHTML =
    `<option value="todas">Todas las tallas</option>` +
    sizes.map((s) => `<option value="${s}">${s}</option>`).join("");

  // Colores
  const colors = Array.from(
    new Set(
      validVariants
        .map((v) => v.color)
        .filter((c) => c && c.trim() !== "")
    )
  ).sort();

  filterColorSelect.innerHTML =
    `<option value="todos">Todos los colores</option>` +
    colors.map((c) => `<option value="${c}">${c}</option>`).join("");

  // Rangos de precio ya están definidos en el HTML
}

function getFilteredProducts() {
  if (!Array.isArray(allProducts) || allProducts.length === 0) return [];

  const needle = currentSearch.trim().toLowerCase();

  return allProducts.filter((p) => {
    const variantsForProduct = allVariants.filter(
      (v) =>
        Number(v.id_producto) === Number(p.id_producto) &&
        (v.stock == null || v.stock > 0)
    );

    // RF-4.2: solo productos con stock disponible
    if (variantsForProduct.length === 0) return false;

    // Buscador
    if (needle) {
      const haystack = `${p.nombre || ""} ${p.descripcion || ""} ${
        p.marca || ""
      } ${p.categoria || ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    // Categoría
    if (currentCategory !== "todas" && p.categoria !== currentCategory) {
      return false;
    }

    // Talla
    if (currentSize !== "todas") {
      const matchSize = variantsForProduct.some(
        (v) =>
          String(v.talla || "").toLowerCase() ===
          currentSize.toLowerCase()
      );
      if (!matchSize) return false;
    }

    // Color
    if (currentColor !== "todos") {
      const matchColor = variantsForProduct.some(
        (v) =>
          String(v.color || "").toLowerCase() ===
          currentColor.toLowerCase()
      );
      if (!matchColor) return false;
    }

    // Precio mínimo del producto (por variantes)
    const prices = variantsForProduct.map((v) =>
      Number(v.precio != null ? v.precio : 0)
    );
    const minPrice = prices.length ? Math.min(...prices) : 0;

    if (currentPrice !== "todas") {
      const [minStr, maxStr] = currentPrice.split("-");
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (Number.isFinite(min) && minPrice < min) return false;
      if (Number.isFinite(max) && minPrice > max) return false;
    }

    return true;
  });
}

function renderPagination(totalPages) {
  if (!catalogPagination) return;

  if (totalPages <= 1) {
    catalogPagination.innerHTML = "";
    return;
  }

  let html = "";

  html += `<button class="pagination-btn" data-page="prev" ${
    currentPage === 1 ? "disabled" : ""
  }>&laquo;</button>`;

  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="pagination-btn ${
      p === currentPage ? "active" : ""
    }" data-page="${p}">${p}</button>`;
  }

  html += `<button class="pagination-btn" data-page="next" ${
    currentPage === totalPages ? "disabled" : ""
  }>&raquo;</button>`;

  catalogPagination.innerHTML = html;
}

function renderCatalog() {
  const filtered = getFilteredProducts();

  if (!filtered.length) {
    catalogGrid.innerHTML = "";
    catalogMessage.textContent =
      "No se encontraron productos con los filtros aplicados.";
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const cardsHtml = pageItems
    .map((p) => {
      const variantsForProduct = allVariants.filter(
        (v) =>
          Number(v.id_producto) === Number(p.id_producto) &&
          (v.stock == null || v.stock > 0)
      );

      if (variantsForProduct.length === 0) return "";

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
              <button
                type="button"
                class="btn-link btn-view-variants"
              >
                Ver tallas y colores
              </button>
              <select class="product-variant-select">
                ${optionsHtml}
              </select>
            </div>

            <div class="product-card-actions">
              <div class="form-group">
                <label>Cant.</label>
                <input
                  type="number"
                  class="product-qty-input"
                  min="1"
                  value="1"
                />
              </div>
              <div class="product-card-buttons">
                <button
                  class="btn btn-primary btn-add-cart"
                  type="button"
                >
                  Agregar al carrito
                </button>
                <button
                  class="btn btn-outline btn-buy-now"
                  type="button"
                >
                  Comprar ahora
                </button>
              </div>
            </div>

            <p class="form-message product-stock-msg"></p>
          </div>
        </article>
      `;
    })
    .join("");

  catalogGrid.innerHTML = cardsHtml || "";
  catalogMessage.textContent = `Mostrando ${
    pageItems.length
  } de ${filtered.length} producto(s).`;

  renderPagination(totalPages);
}

function openVariantModal(productId) {
  if (!variantModal || !variantModalBody) return;

  const product = allProducts.find(
    (p) => Number(p.id_producto) === Number(productId)
  );
  if (!product) return;

  const variantsForProduct = allVariants.filter(
    (v) =>
      Number(v.id_producto) === Number(productId) &&
      (v.stock == null || v.stock > 0)
  );

  const img =
    product.imagen_url ||
    "https://via.placeholder.com/400x300?text=Sin+imagen";

  const safeName = String(product.nombre || "");

  let rowsHtml = "";
  if (!variantsForProduct.length) {
    rowsHtml =
      '<tr><td colspan="4">Sin variantes con stock disponible.</td></tr>';
  } else {
    rowsHtml = variantsForProduct
      .map((v) => {
        const price = Number(v.precio || 0).toFixed(2);
        const stockText =
          v.stock != null ? v.stock : "N/D";
        return `
          <tr>
            <td>${v.talla || "-"}</td>
            <td>${v.color || "-"}</td>
            <td>B/. ${price}</td>
            <td>${stockText}</td>
          </tr>
        `;
      })
      .join("");
  }

  variantModalBody.innerHTML = `
    <h3 class="modal-title">${safeName}</h3>
    <p class="modal-subtitle">${product.descripcion || ""}</p>
    <div class="modal-product">
      <img
        src="${img}"
        alt="${safeName}"
        class="modal-product-image"
      />
      <div class="modal-product-info">
        <table class="table modal-table">
          <thead>
            <tr>
              <th>Talla</th>
              <th>Color</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  variantModal.classList.remove("hidden");
}

function closeVariantModal() {
  if (!variantModal) return;
  variantModal.classList.add("hidden");
}

// --- Helpers catálogo / carrito existentes ---

function getVariantById(idVariante) {
  return allVariants.find(
    (v) => Number(v.id_variante) === Number(idVariante)
  );
}

function renderCart() {
  if (cart.length === 0) {
    cartBody.innerHTML = "";
    cartCountSpan.textContent = "0";
    cartTotalSpan.textContent = "B/. 0.00";
    cartMessage.textContent = "Tu carrito está vacío.";
    return;
  }

  let total = 0;
  const rowsHtml = cart
    .map((item, index) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      return `
        <tr data-index="${index}">
          <td>${item.producto}</td>
          <td>${item.talla || "-"}</td>
          <td>${item.color || "-"}</td>
          <td>${item.cantidad}</td>
          <td>B/. ${subtotal.toFixed(2)}</td>
          <td>
            <button class="btn btn-outline btn-remove-item" type="button">
              X
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  cartBody.innerHTML = rowsHtml;
  cartCountSpan.textContent = String(cart.length);
  cartTotalSpan.textContent = `B/. ${total.toFixed(2)}`;

  saveCart();
}

// --- Manejo de clicks en el catálogo (agregar al carrito / ver variantes / comprar ahora) ---

catalogGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;

  // Ver variantes en modal
  const viewBtn = e.target.closest(".btn-view-variants");
  if (viewBtn) {
    openVariantModal(card.dataset.productId);
    return;
  }

  // Agregar al carrito / Comprar ahora
  const addBtn = e.target.closest(".btn-add-cart");
  const buyBtn = e.target.closest(".btn-buy-now");

  if (!addBtn && !buyBtn) return;

  const isBuyNow = Boolean(buyBtn);

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
    .filter((item) => item.id_variante === variant.id_variante)
    .reduce((sum, item) => sum + item.cantidad, 0);

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
  stockMsg.textContent = isBuyNow
    ? "Producto agregado. Revisa el resumen de tu pedido."
    : "Producto agregado al carrito.";
  stockMsg.classList.add("success");

  if (isBuyNow && orderForm) {
    orderForm.scrollIntoView({ behavior: "smooth" });
  }
});

// Listeners para modal de variantes
if (variantModalClose) {
  variantModalClose.addEventListener("click", closeVariantModal);
}

if (variantModal) {
  variantModal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      closeVariantModal();
    }
  });
}

// Buscador y filtros catálogo
if (catalogSearchInput) {
  catalogSearchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    currentPage = 1;
    renderCatalog();
  });
}

if (filterCategorySelect) {
  filterCategorySelect.addEventListener("change", (e) => {
    currentCategory = e.target.value || "todas";
    currentPage = 1;
    renderCatalog();
  });
}

if (filterSizeSelect) {
  filterSizeSelect.addEventListener("change", (e) => {
    currentSize = e.target.value || "todas";
    currentPage = 1;
    renderCatalog();
  });
}

if (filterColorSelect) {
  filterColorSelect.addEventListener("change", (e) => {
    currentColor = e.target.value || "todos";
    currentPage = 1;
    renderCatalog();
  });
}

if (filterPriceSelect) {
  filterPriceSelect.addEventListener("change", (e) => {
    currentPrice = e.target.value || "todas";
    currentPage = 1;
    renderCatalog();
  });
}

// Paginación
if (catalogPagination) {
  catalogPagination.addEventListener("click", (e) => {
    const btn = e.target.closest("button.pagination-btn");
    if (!btn) return;

    const page = btn.getAttribute("data-page");

    if (page === "prev") {
      if (currentPage > 1) {
        currentPage--;
        renderCatalog();
      }
      return;
    }

    if (page === "next") {
      const totalPages =
        Math.ceil(getFilteredProducts().length / PAGE_SIZE) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderCatalog();
      }
      return;
    }

    const num = Number(page);
    if (!Number.isNaN(num)) {
      currentPage = num;
      renderCatalog();
    }
  });
}

// --- Login de cliente ---

clientLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clientLoginMessage.textContent = "";
  clientLoginMessage.classList.remove("error", "success");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    clientLoginMessage.textContent = "Completa correo y contraseña.";
    clientLoginMessage.classList.add("error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/clientes/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      clientLoginMessage.textContent = data.mensaje || "Error al iniciar sesión.";
      clientLoginMessage.classList.add("error");
      return;
    }

    clientLoginMessage.textContent = "Inicio de sesión exitoso.";
    clientLoginMessage.classList.add("success");

    if (data.token && data.cliente) {
      saveClientSession(data.token, data.cliente.nombre_completo, data.cliente.email);
    }
  } catch (error) {
    console.error("Error en login de cliente:", error);
    clientLoginMessage.textContent =
      "Error al conectar con el servidor de autenticación.";
    clientLoginMessage.classList.add("error");
  }
});

// --- Registro de cliente ---

clientRegisterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clientRegisterMessage.textContent = "";
  clientRegisterMessage.classList.remove("error", "success");

  const nombre_completo = document
    .getElementById("register-name")
    .value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document
    .getElementById("register-password")
    .value.trim();

  if (!nombre_completo || !email || !password) {
    clientRegisterMessage.textContent =
      "Nombre, correo y contraseña son obligatorios.";
    clientRegisterMessage.classList.add("error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/clientes/registro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre_completo, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      clientRegisterMessage.textContent =
        data.mensaje || "Error al registrar la cuenta.";
      clientRegisterMessage.classList.add("error");
      return;
    }

    clientRegisterMessage.textContent =
      "Cuenta creada correctamente. Ahora puedes iniciar sesión.";
    clientRegisterMessage.classList.add("success");
  } catch (error) {
    console.error("Error en registro de cliente:", error);
    clientRegisterMessage.textContent =
      "Error al conectar con el servidor de registro.";
    clientRegisterMessage.classList.add("error");
  }
});

// --- Logout de cliente ---

clientLogoutBtn.addEventListener("click", () => {
  clearClientSession();
  clientLoginMessage.textContent = "";
  clientRegisterMessage.textContent = "";
});

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
    btnTabRegister.classList.remove("btn-outline");
    btnTabRegister.classList.add("btn-secondary");
    btnTabLogin.classList.remove("btn-secondary");
    btnTabLogin.classList.add("btn-outline");
  }
}

// --- Manejo de eliminación en carrito ---

cartBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-remove-item");
  if (!btn) return;

  const row = btn.closest("tr");
  const index = row ? row.getAttribute("data-index") : null;
  if (index == null) return;

  cart.splice(Number(index), 1);
  renderCart();
});

// --- Registro del pedido ---

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  orderMessage.textContent = "";
  orderMessage.classList.remove("error", "success");

  if (!clientSession) {
    orderMessage.textContent =
      "Debes iniciar sesión como cliente para realizar un pedido.";
    orderMessage.classList.add("error");
    return;
  }

  if (cart.length === 0) {
    orderMessage.textContent =
      "Tu carrito está vacío. Agrega productos antes de continuar.";
    orderMessage.classList.add("error");
    return;
  }

  const direccion_entrega = orderAddressInput.value.trim();
  const metodo_pago = orderPaymentSelect.value;

  if (!direccion_entrega || !metodo_pago) {
    orderMessage.textContent =
      "Completa la dirección de entrega y el método de pago.";
    orderMessage.classList.add("error");
    return;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  const payload = {
    direccion_entrega,
    metodo_pago,
    total,
    items: cart.map((item) => ({
      id_variante: item.id_variante,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
    })),
  };

  try {
    const res = await fetch(`${API_URL}/pedidos/crear-desde-tienda`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: clientSession?.token
          ? `Bearer ${clientSession.token}`
          : "",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      orderMessage.textContent =
        data.mensaje || "No se pudo registrar el pedido.";
      orderMessage.classList.add("error");
      return;
    }

    orderMessage.textContent =
      data.mensaje || "Pedido registrado correctamente. ¡Gracias por tu compra!";
    orderMessage.classList.add("success");

    cart = [];
    renderCart();
    orderForm.reset();
  } catch (error) {
    console.error("Error registrando pedido:", error);
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
});


/**--------------------------------------------------------------- */



// --- Paneles superiores: Carrito / Mi cuenta / Datos del pedido ---

function initToolbarPanels() {
  const buttons = document.querySelectorAll(".toolbar-tab-btn");
  const panels = document.querySelectorAll(".toolbar-panel");

  if (!buttons.length || !panels.length) return;

  function activatePanel(target) {
    // Cambiar estilos de botones
    buttons.forEach((btn) => {
      const isActive = btn.dataset.toolbarTarget === target;
      btn.classList.toggle("btn-secondary", isActive);
      btn.classList.toggle("btn-outline", !isActive);
    });

    // Mostrar/ocultar paneles
    panels.forEach((panel) => {
      const isMatch = panel.dataset.panel === target;
      panel.classList.toggle("active", isMatch);
    });
  }

  // Panel inicial
  activatePanel("cart");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.toolbarTarget;
      if (!target) return;
      activatePanel(target);
    });
  });
}

// Inicializar paneles cuando cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  initToolbarPanels();
});
