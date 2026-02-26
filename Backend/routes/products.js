

// #1 Som kund vill jag kunna se alla tillgängliga produkter så att jag kan bläddra i sortimentet

// app.get betyder: när någon gör en GET-request till /products ska denna funktion köras.
app.get("/products", (req, res) => {
    // db.query skickar SQL till databasen.
    db.query("SELECT * FROM products", (err, result) => {
        //"err" blir satt om något går fel.
        //500 betyder "serverfel". Skickar felet så du ser vad som gick snett.
        if (err) return res.status(500).send(err);
        // "result" innehåller datan (raderna) från SELECT.
        // Skickar tillbaka alla produkter som JSON till klienten (ex. Thunder Client).
        res.send(result);
    });
});


// #2 Som kund vill jag kunna söka efter produkter så att jag snabbt kan hitta specifika varor
app.get("/products/search", (req, res) => {
    const search = req.query.q;

    // Validering
    if (!search) {
        return res.status(400).json({ error: "Search query required" });
    }

    // SQL
    const sql = `
    SELECT id, product_name, price, sku, stock_quantity
    FROM products
    WHERE product_name LIKE CONCAT('%', ?, '%')
    ORDER BY product_name LIKE CONCAT(?, '%') DESC,
             product_name
    LIMIT 100
  `;

    // Kör query med callback
    db.query(sql, [search, search], (err, rows) => {
        if (err) {
            console.error(err); // för debug
            return res.status(500).json({ error: "Database error" });
        }

        // Returnera resultat
        res.json(rows);
    });
});


//#3 Som kund vill jag kunna se detaljerad information om en enskild produkt så att jag kan fatta köpbeslut

// Exempel: /products/5 -> req.params.id blir "5"
app.get("/products/:id", (req, res) => {
    const id = req.params.id;

    db.query("SELECT * FROM products WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (!result.length)
            return res.status(404).send("Produkten hittades inte");

        res.send(result[0]);
    });
});


// #4 Som kund vill jag kunna filtrera produkter efter kategori
app.get("/products/category/:id", (req, res) => {
    const categoryId = req.params.id;

    const sql = `
        SELECT 
            c.category_name AS kategori,
            p.sku AS artikelnummer,
            p.product_name AS produkt,
            p.price AS pris,
            p.stock_quantity AS lagersaldo
        FROM products p
        JOIN categories_products cp ON p.id = cp.products_id
        JOIN categories c ON c.id = cp.categories_id
        WHERE c.id = ?
    `;

    db.query(sql, [categoryId], (err, results) => {
        if (err) return res.status(500).send(err);

        if (!results.length) {
            return res.status(404).send({
                message: "Inga produkter hittades i denna kategori.",
            });
        }

        res.send(results);
    });
});


// ++ #5 Som kund vill jag kunna se om en produkt finns i lager
app.get("/products/:id/stock", (req, res) => {
    const id = req.params.id;

    const sql = `
        SELECT 
            product_name,
            stock_quantity
        FROM products
        WHERE id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.length === 0) {
            return res
                .status(404)
                .send({ message: "Produkten hittades inte." });
        }

        const product = results[0];

        res.send({
            produkt: product.product_name,
            lagersaldo: product.stock_quantity,
            lagerstatus: product.stock_quantity > 0,
        });
    });
});
