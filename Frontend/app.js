const searchInput = document.getElementById("searchInput");
const searchBtn = document.querySelector(".search-btn");

const API_BASE = "http://127.0.0.1:3000";

// ====== HELPERS ======
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
    }
    return res.json();
}
function formatPriceSEK(price) {
    const n = Number(price);
    if (!Number.isFinite(n)) return `${price} kr`;
    return new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
    }).format(n);
}

function stockStatusText(stockQty) {
    const stock = Number(stockQty);
    // din ternary-logik (med stock_quantity)
    return stock === 0
        ? "Slut i lager"
        : stock < 10
          ? "Få i lager (< 10)"
          : "Finns i lager (+ 10)";
}
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
    }

    return res.json();
}
// ---------- HEADER ----------

// ----- Kategori meny (Hamburgare) -----
const categories = [
    { id: 1, name: "Barnspel" },
    { id: 2, name: "Kortspel" },
    { id: 3, name: "Tvåspelarspel" },
    { id: 4, name: "Escape room-spel" },
    { id: 5, name: "Musikspel" },
    { id: 6, name: "Spelserier" },
    { id: 7, name: "Expansioner" },
    { id: 8, name: "Pedagogiska spel" },
    { id: 9, name: "Strategispel" },
    { id: 10, name: "Familjespel" },
    { id: 11, name: "Tillbehör" },
    { id: 12, name: "Partyspel" },
    { id: 13, name: "Resespel" },
    { id: 14, name: "Klassiska spel" },
    { id: 15, name: "Rollspel" },
    { id: 16, name: "Samarbetsspel" },
];

function qs(sel) {
    return document.querySelector(sel);
}

function getBaseUrl() {
    const el = qs("#apiBase");
    // om du inte har apiBase-input längre, sätt base här:
    const base = el ? el.value.trim() : "http://localhost:3000";
    return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        credentials: "include",
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
        ? await res.json()
        : await res.text();
    if (!res.ok)
        throw new Error(
            typeof data === "string" ? data : data?.message || "Request failed",
        );
    return data;
}

function initCategoryMenu() {
    const btn = qs("#menuBtn");
    const overlay = qs("#menuOverlay");
    const dropdown = qs("#menuDropdown");
    const closeBtn = qs("#menuClose");
    const list = qs("#menuList");

    if (!btn || !overlay || !dropdown || !closeBtn || !list) return;

    // Build list
    list.innerHTML = "";
    for (const c of categories) {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "menu-item";
        b.innerHTML = `<span>${c.name}</span><span class="menu-item__id">#${c.id}</span>`;

        b.addEventListener("click", async () => {
            try {
                const data = await apiGet(`/products/category/${c.id}`);
                renderProducts(data);

                const titleEl = document.getElementById("pageTitle");
                if (titleEl) titleEl.textContent = c.name;
            } catch (e) {
                console.error(e);
                alert(`Kunde inte hämta kategori ${c.id}: ${e.message}`);
            } finally {
                closeMenu();
            }
        });

        li.appendChild(b);
        list.appendChild(li);
    }

    function openMenu() {
        overlay.hidden = false;
        dropdown.hidden = false;
        btn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        overlay.hidden = true;
        dropdown.hidden = true;
        btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", () => {
        const isOpen = !dropdown.hidden;
        if (isOpen) closeMenu();
        else openMenu();
    });

    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dropdown.hidden) closeMenu();
    });
}

document.addEventListener("DOMContentLoaded", initCategoryMenu);

function initCartDropdown() {
    const cartBtn = document.getElementById("cartBtn");
    const overlay = document.getElementById("cartOverlay");
    const dropdown = document.getElementById("cartDropdown");
    const closeBtn = document.getElementById("cartClose");

    // Debug: ser du dessa i console?
    console.log(
        "cartBtn:",
        cartBtn,
        "overlay:",
        overlay,
        "dropdown:",
        dropdown,
    );

    if (!cartBtn || !overlay || !dropdown || !closeBtn) return;

    function openCart() {
        overlay.hidden = false;
        dropdown.hidden = false;
        loadCart().catch(console.error);
    }

    function closeCart() {
        overlay.hidden = true;
        dropdown.hidden = true;
    }

    cartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = !dropdown.hidden;
        if (isOpen) closeCart();
        else openCart();
    });

    closeBtn.addEventListener("click", closeCart);
    overlay.addEventListener("click", closeCart);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dropdown.hidden) closeCart();
    });
}

document.addEventListener("DOMContentLoaded", initCartDropdown);

// Funktion som kör sökning
async function runSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    try {
        const data = await apiGet(
            `/products/search?q=${encodeURIComponent(query)}`,
        );
        console.log("Search results:", data);
        renderProducts(data);
    } catch (err) {
        console.error(err);
    }
}

// Klick på ikon
searchBtn.addEventListener("click", runSearch);
// Enter i input
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        runSearch();
    }
});

//  ============ MAIN ============

// Rendera produkter i din UL
function renderProducts(products) {
    const list = document.getElementById("productList");
    list.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
        list.innerHTML = `<li class="empty-state">Inga produkter hittades.</li>`;
        return;
    }

    for (const p of products) {
        const li = document.createElement("li");
        li.className = "product-card";
        /*     const category = p.categories ?? ""; */

        li.innerHTML = `
      <div class="product-img" aria-hidden="true"></div>

      <div class="product-body">
        <h3 class="product-name">${p.product_name}</h3>
        <div class="product-price">${p.price} kr</div>

        <div class="product-actions">
          <button class="btn btn-primary" type="button" data-action="add-to-cart" data-id="${p.id}">
            Lägg i kundvagn
          </button>
          <button class="btn btn-ghost" type="button" data-action="details" data-id="${p.id}">
            Visa mer
          </button>
        </div>
      </div>
    `;

        list.appendChild(li);
    }
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);
    if (!Number.isFinite(id)) return;

    if (action === "details") {
        openProductDetails(id);
        return;
    }

    if (action === "add-to-cart") {
        const originalText = btn.textContent;
        btn.disabled = true;

        addToCart(id, 1)
            .then(() => {
                btn.textContent = "✔";
                btn.classList.add("added");

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove("added");
                    btn.disabled = false;
                }, 1000);
            })
            .catch((err) => {
                console.error(err);
                alert(err.message);
                btn.disabled = false;
            });
    }
});

// Hämta alla produkter
async function loadAllProducts() {
    const products = await apiGet("/products");
    renderProducts(products);

    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = "Produkter";
}
// ====== INIT ======
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadAllProducts(); // <-- Laddar alltid vid sidstart
    } catch (err) {
        console.error(err);
        const list = document.getElementById("productList");
        list.innerHTML = `<li>Kunde inte hämta produkter: ${err.message}</li>`;
    }
});

const modalOverlay = document.getElementById("productModalOverlay");
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");
const modalStockStatus = document.getElementById("modalStockStatus");
const modalCategory = document.getElementById("modalCategory");
const modalAddToCart = document.getElementById("modalAddToCart");

let currentModalProductId = null;

function openModal() {
    modalOverlay.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeModal() {
    modalOverlay.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = "";
    currentModalProductId = null;
}

modalClose?.addEventListener("click", closeModal);
modalOverlay?.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
});

async function openProductDetails(productId) {
    try {
        currentModalProductId = productId;

        // Hämta full produktinfo
        // Om din backend är mountad på /products, är detta rätt:
        const product = await apiGet(`/products/${productId}`);

        modalTitle.textContent = product.product_name ?? "Produkt";
        modalPrice.textContent = formatPriceSEK(product.price);
        modalDesc.textContent =
            product.product_description ?? "Ingen beskrivning.";

        const qty = product.stock_quantity ?? 0;
        modalStockStatus.textContent = stockStatusText(qty);

        const category =
            product.categories ??
            product.category_name ??
            product.kategori ??
            "—";

        if (modalCategory) modalCategory.textContent = category;

        openModal();
    } catch (err) {
        console.error(err);
        alert("Kunde inte hämta produktinfo: " + err.message);
    }
}

// =========================
// CART
// =========================
async function loadCart() {
    const data = await apiGet("/cart"); // förutsätter API_BASE och credentials include i apiGet
    renderCart(data);
}

function renderCart(data) {
    const container = document.getElementById("cartContent");
    if (!container) return;

    const items = data?.items || [];
    const total = data?.total || 0;

    if (items.length === 0) {
        container.innerHTML = `<p class="cart-empty">Din kundvagn är tom</p>`;
        return;
    }

    container.innerHTML = `
    <ul class="cart-list">
      ${items
          .map(
              (it) => `
        <li class="cart-item">
          <div class="cart-row">
            <strong>${it.product_name}</strong>
            <button class="cart-remove" data-id="${it.id}" aria-label="Ta bort">✕</button>
          </div>
          <div class="cart-row">
            <span>${it.qty} st</span>
            <span>${it.line_total} kr</span>
          </div>
        </li>
      `,
          )
          .join("")}
    </ul>
    <div class="cart-total">Totalt: <strong>${total} kr</strong></div>
  `;

    // koppla remove-knappar
    container.querySelectorAll(".cart-remove").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const pid = Number(btn.dataset.id);
            if (!pid) return;

            try {
                const res = await fetch(`${API_BASE}/cart/${pid}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new Error(text || `Failed to remove product ${pid}`);
                }

                await loadCart();
            } catch (err) {
                console.error(err);
                alert("Kunde inte ta bort produkten: " + err.message);
            }
        });
    });
}

async function addToCart(productId, quantity = 1) {
    await apiPost("/cart/add", { product_id: productId, quantity });
    await loadCart(); // uppdatera dropdown efteråt
}

// Koppla modal-knappen "Lägg i kundvagn"
document.addEventListener("DOMContentLoaded", () => {
    const modalAddToCart = document.getElementById("modalAddToCart");

    modalAddToCart?.addEventListener("click", () => {
        if (!currentModalProductId) return;
        addToCart(currentModalProductId, 1).catch(console.error);
    });

    // Ladda faktisk kundvagn från servern direkt (om du vill)
    loadCart().catch(console.error);
});
const logo = document.getElementById("siteLogo");

logo?.addEventListener("click", async () => {
    await loadAllProducts(); // laddar alla produkter igen
});
