
const searchInput = document.getElementById("searchInput");
const searchBtn = document.querySelector(".search-btn");

// ---------- HEADER ----------


// ----- Categories menu (Hamburger) -----
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
                // Enligt din endpoint:
                const data = await apiFetch(`/products/category/${c.id}`, {
                    method: "GET",
                });

                // Om du har en render-funktion för produkter, kalla den här.
                // Exempel:
                // renderProducts(data);

                console.log("Kategori", c.id, c.name, data);
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



// Funktion som kör sökning
async function runSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  try {
    const data = await apiGet(`/products/search?q=${encodeURIComponent(query)}`);
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


// -----MAIN-----

// ====== KONFIG ======
// Om du kör frontend och backend på samma origin (t.ex. http://localhost:3000)
// låt den vara tom: ""
// Om du kör backend på annan port, sätt t.ex. "http://localhost:3000"


const API_BASE = "http://localhost:3000"; // ex: "http://localhost:3000"
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
// Rendera produkter i din UL
function renderProducts(products) {
  const list = document.getElementById("productList");
  list.innerHTML = "";
  if (!Array.isArray(products) || products.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Inga produkter hittades.";
    list.appendChild(li);
    return;
  }
  for (const p of products) {
    const li = document.createElement("li");
    li.innerHTML = `
<strong>${p.product_name}</strong>
<span> • ${p.price} kr</span>
<span> • SKU: ${p.sku}</span>
<span> • Lager: ${p.stock_quantity}</span>
    `;
    list.appendChild(li);
  }
}
// Hämta alla produkter
async function loadAllProducts() {
  const products = await apiGet("/products");
  renderProducts(products);
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

// // Produktlistan
// function renderProducts(products) {
//     const list = document.getElementById("productList");
//     list.innerHTML = "";
//     products.forEach(product => {
//         const li = document.createElement("li");
//         li.textContent = `${product.product_name} - ${product.price} kr`;
//         list.appendChild(li);
//     });
// }