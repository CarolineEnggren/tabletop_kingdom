
/* ------------ENDPOINTS ADMIN-PERSPEKTIV-------- */

//#11 Som admin vill jag kunna lägga till nya produkter så att sortimentet kan växa
app.post("/admin/products", (req, res) => {
    const { product_name, product_description, price, sku, stock_quantity } =
        req.body;

    db.query(
        "INSERT INTO products (product_name, product_description, price, sku, stock_quantity) VALUES (?, ?, ?, ?, ?)",
        [product_name, product_description, price, sku, stock_quantity],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.status(201).json({
                message: "Produkt tillagd!",
                product_id: result.insertId,
            });
        },
    );
});

// #12 Som admin vill jag kunna uppdatera produktinformation så att informationen hålls aktuell

app.patch("/admin/products/:id", (req, res) => {
    const id = req.params.id;
    const updates = []; // Array som ska innehålla SQL-delar som "price = ?" osv. Vi fyller den bara med fält som faktiskt ska uppdateras
    const values = []; //Array med själva värdena som ska ersätta ? i SQL-queryn. Dessa matchas i samma ordning som frågetecknen

    // Kollar om frontend skickade ett nytt produktnamn
    // !== undefined betyder "fältet finns med i requesten"
    if (req.body.product_name !== undefined) {
        updates.push("product_name = ?"); // Lägg till SQL-fragment för UPDATE-satsen
        values.push(req.body.product_name); // Lägg till själva värdet som ska sättas i databasen
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

    if (updates.length === 0) {
        return res.status(400).json({ message: "Inga fält att uppdatera." });
    }

    // updates.join(", ") gör t.ex:
    // ["price = ?", "stock_quantity = ?"]
    // → "price = ?, stock_quantity = ?"
    const sql = `
        UPDATE products
        SET ${updates.join(", ")}
        WHERE id = ?
    `;

    // Lägg till id i slutet av values så det matchar det sista ? i SQL-frågan
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

// #13 Som admin vill jag kunna ta bort produkter så att utgående produkter kan rensas bort
app.delete("/admin/products/:id", (req, res) => {
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

// #14 Som admin vill jag kunna se alla ordrar så att jag kan hantera verksamheten
app.get("/admin/orders", (req, res) => {
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