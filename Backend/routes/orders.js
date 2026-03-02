const express = require("express");
const router = express.Router();
const db = require("../database");

/**Userstory:
 * #6 Som kund vill jag kunna slutföra ett köp/lägga en order så att jag kan genomföra mina inköp
 *
 * POST /orders
 * Skapar en ny order.
 *
 * Vi gör flera saker i denna endpoint:
 * - Vi validerar input
 * - Vi hämtar aktuella priser från DB (så man inte kan fuska genom att skicka egna priser)
 * - Vi räknar totalsumma
 * - Vi skapar en rad i orders
 * - Vi skapar flera rader i order_items
 */
router.post("/", (req, res) => {
    const {
        customer_id,
        delivery_name,
        delivery_street,
        delivery_postalcode,
        delivery_city,
        delivery_country,
        items,
    } = req.body || {};

    // Grundvalidering: alla fält måste finnas och items får inte vara tom.
    if (
        !customer_id ||
        !delivery_name ||
        !delivery_street ||
        !delivery_postalcode ||
        !delivery_city ||
        !delivery_country ||
        !items ||
        items.length === 0
    ) {
        return res.status(400).send("Alla fält + items krävs");
    }

    // Plocka ut alla produkt-id så vi kan hämta priser i en query.
    const productIds = items.map((i) => i.product_id);

    // Hämta priser från DB för de produkt-id:n som finns i ordern.
    db.query(
        "SELECT id, price FROM products WHERE id IN (?)",
        [productIds],
        (err, products) => {
            if (err) return res.status(500).send(err);

            // Räkna totalsumma
            let total = 0;

            for (const item of items) {
                const product = products.find((p) => p.id === item.product_id);

                if (!product) {
                    return res.status(400).send("Ogiltig produkt i ordern");
                }

                total += product.price * item.quantity;
            }

            // Skapa order (med total_amount)
            db.query(
                `INSERT INTO orders
                (
                  customer_id,
                  delivery_name,
                  delivery_street,
                  delivery_postalcode,
                  delivery_city,
                  delivery_country,
                  total_amount,
                  order_date
                )
                VALUES (?,?,?,?,?,?,?, NOW())`,
                [
                    customer_id,
                    delivery_name,
                    delivery_street,
                    delivery_postalcode,
                    delivery_city,
                    delivery_country,
                    total,
                ],
                (err2, orderResult) => {
                    if (err2) return res.status(500).send(err2);

                    const orderId = orderResult.insertId;

                    // Skapa order_items: en rad per produkt i ordern.
                    const values = items.map((i) => {
                        const product = products.find(
                            (p) => p.id === i.product_id,
                        );

                        if (!product) {
                            // Detta ska inte hända eftersom vi validerade ovan,
                            // men vi har kvar det som en extra säkerhet.
                            throw new Error("Produkt saknas: " + i.product_id);
                        }

                        return [
                            orderId,
                            i.product_id,
                            i.quantity,
                            product.price,
                        ];
                    });

                    db.query(
                        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?",
                        [values],
                        (err3) => {
                            if (err3) return res.status(500).send(err3);

                            // Klart
                            res.status(201).send({
                                message: "Order skapad!",
                                order_id: orderId,
                                total_amount: total,
                            });
                        },
                    );
                },
            );
        },
    );
});

/**Userstory:
 * #7  Som kund vill jag kunna se mina tidigare ordrar så att jag har koll på min köphistorik
 *
 * GET /orders/:id
 * Hämtar tidigare ordrar för en kund (customer_id).
 * Returnerar orderhistorik med ordernummer, artikelnummer, produktnamn och datum.
 */
router.get("/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
        SELECT 
            o.id  AS ordernummer,
            p.sku AS artikelnummer, 
            p.product_name AS produkt, 
            oi.unit_price AS pris, 
            o.order_date AS orderdatum 
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE customer_id = ?
        ORDER BY orderdatum DESC;
    `;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (!result.length) return res.status(404).send("Inga ordrar hittades");

        res.send(result);
    });
});

module.exports = router;
