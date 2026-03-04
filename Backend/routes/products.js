const express = require("express");
const router = express.Router();
const db = require("../database");

/**Userstory:
 * #1 Som kund vill jag kunna se alla tillgängliga produkter så att jag kan bläddra i sortimentet
 *
 * GET /products
 * Returnerar alla produkter i databasen.
 */
router.get("/", (req, res) => {
    db.query("SELECT * FROM products", (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

/**Userstory:
 * #2 Som kund vill jag kunna söka efter produkter så att jag snabbt kan hitta specifika varor
 *
 * GET /products/search?q=...
 * Söker på produktnamn med SQL LIKE.
 *
 * - CONCAT('%', ?, '%') betyder "innehåller söktermen någonstans"
 * - ORDER BY med "LIKE CONCAT(?, '%')" prioriterar produkter som börjar på söktermen
 */
router.get("/search", (req, res) => {
    const search = req.query.q;

    if (!search) {
        return res.status(400).json({ error: "Du måste ange en sökterm" });
    }

    const sql = `
        SELECT id, product_name, price, sku, stock_quantity
        FROM products
        WHERE product_name LIKE CONCAT('%', ?, '%')
        ORDER BY product_name LIKE CONCAT(?, '%') DESC,
                 product_name
        LIMIT 100
    `;

    db.query(sql, [search, search], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        res.json(rows);
    });
});

/**Userstory:
 * #3 Som kund vill jag kunna filtrera produkter efter kategori
 *
 * GET /products/category/:id
 * Hämtar produkter som tillhör en kategori.
 * Tabellen categories_products är en kopplingstabell mellan categories och products.
 */
router.get("/category/:id", (req, res) => {
    const categoryId = req.params.id;

    const sql = `
        SELECT
            p.id,
            p.product_name,
            p.price,
            p.sku,
            p.stock_quantity
        FROM products p
        JOIN categories_products cp ON cp.products_id = p.id
        WHERE cp.categories_id = ?
        ORDER BY p.product_name
        LIMIT 100;
    `;

    db.query(sql, [categoryId], (err, results) => {
        if (err) return res.status(500).send(err);

        if (!results.length) {
            return res.status(404).send({ message: "Kategori hittades inte." });
        }

        res.send(results);
    });
});

/**Userstory:
 * ++ #4 Som kund vill jag kunna se om en produkt finns i lager
 * #5 Som kund vill jag kunna se detaljerad information om en enskild produkt så att jag kan fatta köpbeslut
 *
 * GET /products/:id
 * Hämtar detaljinformation om en produkt.
 *
 * - LEFT JOIN gör att vi får med produkter även om de saknar kategori
 * - GROUP_CONCAT slår ihop flera kategorirader till en sträng
 * - GROUP BY behövs när man använder GROUP_CONCAT
 */
router.get("/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
        SELECT
            p.id,
            p.product_name,
            p.product_description,
            p.price,
            p.sku,
            p.stock_quantity,
            p.is_eol,
            GROUP_CONCAT(c.category_name ORDER BY c.category_name SEPARATOR ', ') AS categories
        FROM products p
        LEFT JOIN categories_products cp ON cp.products_id = p.id
        LEFT JOIN categories c ON c.id = cp.categories_id
        WHERE p.id = ?
        GROUP BY p.id
    `;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);

        if (!result.length)
            return res.status(404).send("Produkten hittades inte");

        res.send(result[0]);
    });
});

module.exports = router;
