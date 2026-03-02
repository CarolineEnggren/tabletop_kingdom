const express = require("express");
const router = express.Router();
const db = require("../database");

/**Userstory:
 * #11 Som admin vill jag kunna lägga till nya produkter så att sortimentet kan växa
 *
 * POST /admin/products
 * Skapar (INSERT) en ny produkt i databasen.
 * Förväntar sig att frontend skickar ett JSON-body med produktens fält.
 */
router.post("/products", (req, res) => {
    const { product_name, product_description, price, sku, stock_quantity } =
        req.body;

    const sql =
        "INSERT INTO products (product_name, product_description, price, sku, stock_quantity) VALUES (?, ?, ?, ?, ?)";

    db.query(
        sql,
        [product_name, product_description, price, sku, stock_quantity],
        (err, result) => {
            if (err) return res.status(500).json(err);

            res.status(201).json({
                message: "Produkt tillagd!",
                product_id: result.insertId, // id som MySQL skapade
            });
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
 */
router.patch("/products/:id", (req, res) => {
    const id = req.params.id;

    const updates = []; // SQL-delar, t.ex. "price = ?"
    const values = []; // Värden som ska ersätta frågetecknen

    // För varje fält: om det finns med i body så lägger vi till det i UPDATE.
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

    // Om inget fält skickades in finns inget att uppdatera.
    if (updates.length === 0) {
        return res.status(400).json({ message: "Inga fält att uppdatera." });
    }

    // Exempel: updates = ["price = ?", "stock_quantity = ?"]
    // updates.join(", ") => "price = ?, stock_quantity = ?"
    const sql = `
        UPDATE products
        SET ${updates.join(", ")}
        WHERE id = ?
    `;

    // Sista ? i SQL är id
    values.push(id);

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .send({ message: "Produkten hittades inte." });
        }

        res.send({ message: "Produkt uppdaterad!" });
    });
});

/**Userstory:
 * #13 Som admin vill jag kunna ta bort produkter så att utgående produkter kan rensas bort
 *
 * DELETE /admin/products/:id
 * Tar bort en produkt från databasen.
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
