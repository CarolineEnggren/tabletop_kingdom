const express = require("express");
const router = express.Router();
const db = require("../database");

/**Userstory:
 * #11 Som admin vill jag kunna lägga till nya produkter så att sortimentet kan växa
 *
 * POST /admin/products
 * Skapar (INSERT) en ny produkt i databasen.
 * Förväntar sig att frontend skickar ett JSON-body med produktens fält.
 * Om kategorier skickas med så läggs även relationer i categories_products-tabellen.
 */
router.post("/products", (req, res) => {
    const {
        product_name,
        product_description,
        price,
        sku,
        stock_quantity,
        categories = [],
    } = req.body;

    const sql =
        "INSERT INTO products (product_name, product_description, price, sku, stock_quantity) VALUES (?, ?, ?, ?, ?)";

    db.query(
        sql,
        [product_name, product_description, price, sku, stock_quantity],
        (err, result) => {
            if (err) return res.status(500).json(err);

            const productId = result.insertId;

            if (!Array.isArray(categories) || categories.length === 0) {
                return res.status(201).json({
                    message: "Produkt tillagd!",
                    product_id: productId,
                });
            }

            // Matcha tabellens kolumnordning: categories_id, products_id
            const values = categories.map((catId) => [catId, productId]);

            db.query(
                "INSERT INTO categories_products (categories_id, products_id) VALUES ?",
                [values],
                (err2) => {
                    if (err2) return res.status(500).json(err2);

                    res.status(201).json({
                        message: "Produkt tillagd med kategorier!",
                        product_id: productId,
                    });
                },
            );
        },
    );
});

/**Userstory:
 * #12 Som admin vill jag kunna uppdatera produktinformation så att informationen hålls aktuell
 *
 * PATCH /admin/products/:id
 * Uppdaterar (UPDATE) en produkt.
 *
 * PATCH betyder "uppdatera delvis" (till skillnad från PUT som uppdaterar hela resursen).
 * Vi bygger därför en UPDATE-sats dynamiskt och tar bara med de fält som faktiskt skickats in i requesten.
 *
 * Om kategorier skickas med så uppdateras även relationerna i categories_products-tabellen (gamla tas bort, nya läggs till).
 */
router.patch("/products/:id", (req, res) => {
    const id = req.params.id;

    const updates = [];
    const values = [];

    const { categories } = req.body;

    // Bygg UPDATE dynamiskt
    if (req.body.product_name !== undefined) {
        updates.push("product_name = ?");
        values.push(req.body.product_name);
    }

    if (req.body.product_description !== undefined) {
        updates.push("product_description = ?");
        values.push(req.body.product_description);
    }

    if (req.body.price !== undefined) {
        updates.push("price = ?");
        values.push(req.body.price);
    }

    if (req.body.sku !== undefined) {
        updates.push("sku = ?");
        values.push(req.body.sku);
    }

    if (req.body.stock_quantity !== undefined) {
        updates.push("stock_quantity = ?");
        values.push(req.body.stock_quantity);
    }

    if (req.body.is_eol !== undefined) {
        updates.push("is_eol = ?");
        values.push(req.body.is_eol);
    }

    // Om inget produktfält skickades men categories finns → vi tillåter det ändå
    if (updates.length === 0 && categories === undefined) {
        return res.status(400).json({ message: "Inga fält att uppdatera." });
    }

    const updateProduct = (callback) => {
        if (updates.length === 0) return callback(null, { affectedRows: 1 });

        const sql = `
            UPDATE products
            SET ${updates.join(", ")}
            WHERE id = ?
        `;

        values.push(id);

        db.query(sql, values, callback);
    };

    updateProduct((err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .send({ message: "Produkten hittades inte." });
        }

        // Om categories inte skickas → klart
        if (categories === undefined) {
            return res.send({ message: "Produkt uppdaterad!" });
        }

        // Ta bort gamla kategorikopplingar
        db.query(
            "DELETE FROM categories_products WHERE products_id = ?",
            [id],
            (err2) => {
                if (err2) return res.status(500).json(err2);

                // Om tom array → produkten har inga kategorier
                if (!Array.isArray(categories) || categories.length === 0) {
                    return res.send({ message: "Produkt uppdaterad!" });
                }

                // Lägg in nya kopplingar
                const values = categories.map((catId) => [catId, id]);

                db.query(
                    "INSERT INTO categories_products (categories_id, products_id) VALUES ?",
                    [values],
                    (err3) => {
                        if (err3) return res.status(500).json(err3);

                        res.send({
                            message: "Produkt och kategorier uppdaterade!",
                        });
                    },
                );
            },
        );
    });
});

/**Userstory:
 * #13 Som admin vill jag kunna ta bort produkter så att utgående produkter kan rensas bort
 *
 * DELETE /admin/products/:id
 * Tar bort en produkt från databasen.
 *
 * categories_products har ON DELETE CASCADE mot products, så kopplingarna tas bort automatiskt när produkten raderas.
 */
router.delete("/products/:id", (req, res) => {
    const id = req.params.id;

    const sql = "DELETE FROM products WHERE id = ?";

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .send({ message: "Produkten hittades inte." });
        }

        res.status(200).send({ message: "Produkt borttagen!" });
    });
});

/**Userstory:
 * #14 Som admin vill jag kunna se alla ordrar så att jag kan hantera verksamheten
 *
 * GET /admin/orders
 * Hämtar alla ordrar (med kundnamn) så admin kan se verksamheten.
 */
router.get("/orders", (req, res) => {
    const sql = `
        SELECT 
            o.id AS ordernummer,
            CONCAT(c.first_name, ' ', c.last_name) AS kund,
            o.order_date AS orderdatum,
            o.total_amount AS totalsumma
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.order_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

module.exports = router;
