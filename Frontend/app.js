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
