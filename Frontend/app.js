/*
 * app.js (frontend)
 */

// ====== DOM-REFERENSER (saker vi klickar på / skriver i) ======
const searchInput = document.getElementById("searchInput");
const searchBtn = document.querySelector(".search-btn");
const logo = document.getElementById("siteLogo");

// ====== API-KONFIG ======
/**
 * Bas-URL till backend.
 * Eftersom frontend (index.html) körs i webbläsaren och backend kör på port 3000
 * behöver vi veta var API:et finns.
 *
 * Om backend kör någon annanstans ändrar vi här.
 */
const API_BASE = "http://127.0.0.1:3000";

// =========================
// HJÄLPFUNKTIONER
// =========================

/**
 * Gör en GET-request mot backend och returnerar JSON.
 * - credentials: "include" gör att cookies (session) skickas med,
 *   vilket behövs för kundvagnen som ligger i sessionen på servern.
 */
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        // Försök läsa feltext för bättre felmeddelanden.
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
    }

    return res.json();
}

/**
 * Gör en POST-request mot backend och returnerar JSON.
 * Används t.ex. när vi lägger till en produkt i kundvagnen.
 */
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

/**
 * Formaterar ett pris som svensk valuta (SEK).
 * Exempel: 199 -> "199,00 kr" (beroende på webbläsarens Intl-stöd).
 */
function formatPriceSEK(price) {
    const n = Number(price);
    if (!Number.isFinite(n)) return `${price} kr`;

    return new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
    }).format(n);
}

/**
 * Gör om ett lagersaldo (nummer) till en kort text för användaren.
 * Vi använder en "ternary" (?:) för att skriva if/else kompakt.
 */
function stockStatusText(stockQty) {
    const stock = Number(stockQty);

    return stock === 0
        ? "Slut i lager"
        : stock < 10
          ? "Få i lager (< 10)"
          : "Finns i lager (+ 10)";
}

// =========================
// KATEGORI-MENY (Hamburgare)
// =========================

/**
 * Lista med kategorier (id + namn).
 * Id matchar kategorierna i databasen/backenden.
 */
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

/**
 * Bygger upp och kopplar events för kategori-menyn i headern.
 * - När man klickar på en kategori hämtas produkter för den kategorin
 *   och listan på sidan renderas om.
 */
function initCategoryMenu() {
    const btn = document.querySelector("#menuBtn");
    const overlay = document.querySelector("#menuOverlay");
    const dropdown = document.querySelector("#menuDropdown");
    const closeBtn = document.querySelector("#menuClose");
    const list = document.querySelector("#menuList");

    // Om någon av DOM-noderna saknas, avbryt (t.ex. om HTML ändrats).
    if (!btn || !overlay || !dropdown || !closeBtn || !list) return;

    // Bygg listan (rensar först så vi inte dubblar).
    list.innerHTML = "";

    for (const c of categories) {
        const li = document.createElement("li");
        const b = document.createElement("button");

        b.type = "button";
        b.className = "menu-item";
        b.innerHTML = `<span>${c.name}</span><span class="menu-item__id">#${c.id}</span>`;

        // När man klickar: hämta kategori-produkter och rendera.
        b.addEventListener("click", async () => {
            try {
                const data = await apiGet(`/products/category/${c.id}`);
                renderProducts(data);

                // Byt rubrik på sidan till kategorinamnet.
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

    /** Öppnar meny (visar overlay + dropdown). */
    function openMenu() {
        overlay.hidden = false;
        dropdown.hidden = false;
        btn.setAttribute("aria-expanded", "true");
    }

    /** Stänger meny (döljer overlay + dropdown). */
    function closeMenu() {
        overlay.hidden = true;
        dropdown.hidden = true;
        btn.setAttribute("aria-expanded", "false");
    }

    // Klick på menykappen togglar öppet/stängt.
    btn.addEventListener("click", () => {
        const isOpen = !dropdown.hidden;
        if (isOpen) closeMenu();
        else openMenu();
    });

    // Stäng via X eller via att klicka utanför (overlay).
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    // Stäng med ESC.
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !dropdown.hidden) closeMenu();
    });
}

document.addEventListener("DOMContentLoaded", initCategoryMenu);

// =========================
// KUNDVAGN (Dropdown i header)
// =========================

/**
 * Kopplar events till kundvagnsknappen och visar/döljer dropdown.
 * När dropdown öppnas hämtas aktuell kundvagn från servern.
 */
function initCartDropdown() {
    const cartBtn = document.getElementById("cartBtn");
    const overlay = document.getElementById("cartOverlay");
    const dropdown = document.getElementById("cartDropdown");
    const closeBtn = document.getElementById("cartClose");

    if (!cartBtn || !overlay || !dropdown || !closeBtn) return;

    /** Öppnar kundvagn och laddar innehåll från servern. */
    function openCart() {
        overlay.hidden = false;
        dropdown.hidden = false;
        loadCart().catch(console.error);
    }

    /** Stänger kundvagn (döljer overlay + dropdown). */
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

// =========================
// SÖK
// =========================

/**
 * Kör en sökning mot backend (/products/search?q=...).
 * Renderar sedan resultatet på sidan.
 */
async function runSearch() {
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) return;

    try {
        const data = await apiGet(
            `/products/search?q=${encodeURIComponent(query)}`,
        );
        renderProducts(data);

        const titleEl = document.getElementById("pageTitle");
        if (titleEl) titleEl.textContent = `Sök: "${query}"`;
    } catch (err) {
        console.error(err);
        alert("Sökning misslyckades: " + err.message);
    }
}

// Klick på sök-ikon
searchBtn?.addEventListener("click", runSearch);

// Enter i inputfält
searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
});

// =========================
// PRODUKTLISTA (rendering)
// =========================

/**
 * Renderar produkter i <ul id="productList">.
 * Varje produkt skapas som ett <li> med två knappar:
 * - "Lägg i kundvagn"
 * - "Visa mer" (öppnar modal)
 */
function renderProducts(products) {
    const list = document.getElementById("productList");
    if (!list) return;

    list.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
        list.innerHTML = `<li class="empty-state">Inga produkter hittades.</li>`;
        return;
    }

    for (const p of products) {
        const li = document.createElement("li");
        li.className = "product-card";

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

/**
 * Global klick-hanterare (event delegation).
 * Fördel: vi behöver inte sätta en click-listener på varje knapp separat.
 */
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
                // Liten visuell feedback i 1 sekund
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

// =========================
// START: ladda produkter vid sidstart
// =========================

/**
 * Hämtar alla produkter från backend och renderar dem.
 * Används vid sidstart och när man klickar på loggan.
 */
async function loadAllProducts() {
    const products = await apiGet("/products");
    renderProducts(products);

    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = "Produkter";
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadAllProducts();
    } catch (err) {
        console.error(err);
        const list = document.getElementById("productList");
        if (list)
            list.innerHTML = `<li>Kunde inte hämta produkter: ${err.message}</li>`;
    }
});

// =========================
// MODAL (produktdetaljer)
// =========================

const modalOverlay = document.getElementById("productModalOverlay");
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");
const modalStockStatus = document.getElementById("modalStockStatus");
const modalCategory = document.getElementById("modalCategory");
const modalAddToCartBtn = document.getElementById("modalAddToCart");

let currentModalProductId = null;

/** Visar modal och låser scroll på sidan bakom. */
function openModal() {
    if (!modalOverlay || !modal) return;

    modalOverlay.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
}

/** Döljer modal och återställer scroll. */
function closeModal() {
    if (!modalOverlay || !modal) return;

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

/**
 * Hämtar detaljer om en produkt och fyller modalens innehåll.
 * Sedan öppnas modal.
 */
async function openProductDetails(productId) {
    try {
        currentModalProductId = productId;

        // Koppla modalens "Lägg i kundvagn"-knapp till samma click-handler (data-action)
        // Så att den får samma ✔-feedback som produktkorten.
        if (modalAddToCartBtn) {
            modalAddToCartBtn.dataset.id = String(productId); // VIKTIGT: måste vara numeriskt
        }

        // Hämta full produktinfo från backend
        const product = await apiGet(`/products/${productId}`);

        if (modalTitle)
            modalTitle.textContent = product.product_name ?? "Produkt";
        if (modalPrice) modalPrice.textContent = formatPriceSEK(product.price);

        if (modalDesc) {
            modalDesc.textContent =
                product.product_description ?? "Ingen beskrivning.";
        }

        const qty = product.stock_quantity ?? 0;
        if (modalStockStatus)
            modalStockStatus.textContent = stockStatusText(qty);

        // Försök hitta kategori i olika möjliga fält (beroende på backend)
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

/**
 * Kopplar modal-knappen "Lägg i kundvagn" till aktuell produkt i modalen.
 * Vi använder currentModalProductId för att veta vilken produkt som visas.
 */
/* function initModalAddToCart() {
    modalAddToCartBtn?.addEventListener("click", () => {
        if (!currentModalProductId) return;
        addToCart(currentModalProductId, 1).catch(console.error);
    });
}

document.addEventListener("DOMContentLoaded", initModalAddToCart); */

// =========================
// KUNDVAGN (API + rendering)
// =========================

/**
 * Hämtar kundvagnens innehåll från backend (/cart) och renderar dropdown.
 */
async function loadCart() {
    const data = await apiGet("/cart");
    renderCart(data);
}

/**
 * Renderar kundvagnens innehåll i dropdown.
 * Förväntar sig formatet:
 * { items: [{id, product_name, qty, line_total}], total: number }
 */
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

    // Koppla remove-knappar (DELETE /cart/:id)
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

/**
 * Lägger en produkt i kundvagnen (POST /cart/add) och laddar sedan om kundvagnen.
 */
async function addToCart(productId, quantity = 1) {
    await apiPost("/cart/add", { product_id: productId, quantity });
    await loadCart();
}

// Ladda kundvagnen direkt vid sidstart så dropdown visar korrekt läge.
document.addEventListener("DOMContentLoaded", () => {
    loadCart().catch(console.error);
});

// Klick på loggan: visa alla produkter igen.
logo?.addEventListener("click", () => {
    loadAllProducts().catch(console.error);
});
