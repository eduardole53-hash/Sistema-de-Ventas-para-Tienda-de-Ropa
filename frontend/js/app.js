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

// --- Gestión de sesión sencilla con localStorage ---

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

    // En tu backend devuelves algo como:
    // { mensaje: 'Login exitoso', token }
    const token = data.token;
    if (!token) {
      loginMessage.textContent = "No se recibió token del servidor.";
      loginMessage.classList.add("error");
      return;
    }

    // Decodificar payload del JWT para obtener usuario y rol (solo para mostrar)
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    const usuario = payload.nombre_usuario || username;
    const rol = payload.rol || "Desconocido";

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
  showLogin();
});

// --- Cargar productos desde el backend ---

async function loadProductos(token) {
  productosMessage.textContent = "";
  productosMessage.classList.remove("error");
  productosTableBody.innerHTML = "";
  productosCountSpan.textContent = "Cargando...";

  try {
    const response = await fetch(`${API_URL}/productos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Aunque GET /productos no requiere auth, podemos enviar el token:
        Authorization: `Bearer ${token}`,
      },
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
                  ? `<img src="${p.imagen_url}" alt="${p.nombre}" />`
                  : "-"
              }
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

// --- Iniciar al cargar la página ---
document.addEventListener("DOMContentLoaded", initFromSession);

