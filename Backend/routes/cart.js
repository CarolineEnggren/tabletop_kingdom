const express = require("express");
const router = express.Router();
const db = require("../database");

/**Userstory:
 * ++ #8 Som kund vill jag kunna lägga till produkter i varukorgen
 *
 * POST /cart/add
 * Lägger en rad i sessionens kundvagn.
 *
 * OBS: Vi validerar inte mot databasen här (t.ex. om produkten finns).
 * Det görs indirekt när vi sedan hämtar kundvagnen i GET /cart,
 * eftersom vi då slår upp produkterna i databasen.
 */
router.post("/add", (req, res) => {
    const { product_id, quantity } = req.body;

    // Skapa kundvagn om den inte finns i sessionen ännu.
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Vi sparar bara product_id + quantity i sessionen.
    req.session.cart.push({ product_id, quantity });

    // Spara sessionen (asynkront) och svara när den är sparad.
    req.session.save((err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Produkt tillagd i varukorgen!" });
    });
});

/**Userstory:
 * ++ #9 Som kund vill jag kunna se min varukorg med totalpris
 *
 * GET /cart
 * Returnerar kundvagnens innehåll + totalpris.
 *
 * Steg:
 * 1) Läs sessionens cart-array
 * 2) Summera antal per product_id (så dubbletter blir en rad)
 * 3) Hämta produktinfo (pris, namn) från databasen
 * 4) Bygg items[] och total
 */
router.get("/", (req, res) => {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
        return res.json({ items: [], total: 0 });
    }

    // Summera quantity per product_id (så du slipper dubbletter).
    // Eftersom cart ligger i JavaScript/session och inte i MySQL
    // ser vi till att datatyper blir nummer med Number(...).
    const qtyById = {};
    for (const row of cart) {
        const pid = Number(row.product_id);
        const q = Number(row.quantity) || 0;
        if (!pid || q <= 0) continue;
        qtyById[pid] = (qtyById[pid] || 0) + q;
    }

    const ids = Object.keys(qtyById).map(Number);
    if (ids.length === 0) return res.json({ items: [], total: 0 });

    // Skapa placeholders: "?, ?, ?" beroende på hur många id:n vi har.
    const placeholders = ids.map(() => "?").join(",");
    const sql = `
        SELECT id, product_name, price
        FROM products
        WHERE id IN (${placeholders})
    `;

    db.query(sql, ids, (err, products) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const items = products.map((p) => {
            const qty = qtyById[p.id] || 0;
            const price = Number(p.price) || 0;

            return {
                id: p.id,
                product_name: p.product_name,
                price,
                qty,
                line_total: price * qty, // radens totalsumma
            };
        });

        const total = items.reduce((sum, it) => sum + it.line_total, 0);

        res.json({ items, total });
    });
});

/**Userstory:
 * ++ #10 Som kund vill jag kunna ta bort produkter från varukorgen
 *
 * DELETE /cart/:product_id
 * Tar bort en produkt från kundvagnen (alla rader med samma product_id).
 */
router.delete("/:product_id", (req, res) => {
    const productId = Number(req.params.product_id);

    // Om varukorgen inte finns
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(404).json({ message: "Varukorgen är tom." });
    }

    // Filtrera bort alla rader med samma product_id
    const beforeCount = req.session.cart.length;
    req.session.cart = req.session.cart.filter(
        (item) => Number(item.product_id) !== productId,
    );

    // Om inget togs bort betyder det att produkten inte fanns i varukorgen
    if (req.session.cart.length === beforeCount) {
        return res
            .status(404)
            .send({ message: "Produkten finns inte i varukorgen." });
    }

    res.send({ message: "Produkt borttagen från varukorgen!" });
});

module.exports = router;
