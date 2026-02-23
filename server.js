// Läser in variabler från .env-filen (t.ex. DB_USER, DB_PASSWORD)
// och gör dem tillgängliga via process.env
require("dotenv").config();

// Importerar Express-biblioteket så vi kan skapa en webbserver
// Hämtar Express-paketet från node_modules och gör det tillgängligt i den här filen
const express = require("express");

// Importerar mysql2-biblioteket för att kunna koppla Node.js till MySQL
const mysql = require("mysql2");

// Skapar en Express-applikation (själva servern)
// "app" är objektet vi använder för att skapa endpoints
// (VIKTIGT) Gör så att servern kan läsa JSON i request body
// UTAN den här blir req.body oftast undefined i POST/PATCH-requests
const app = express();

// Koppla till databasen. Vi hämtar alla värden från .env-filen via process.env.VARIABLE_NAME
// Kopplingen används sen i db.query
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Testa koppling
db.connect((err) => {
    // err innehåller felinfo om något går fel (fel lösenord, db inte igång osv)
    if (err) console.log("DB error:", err);
    // annars, om allt gick bra så du direkt ser i terminalen om databasen funkar.
    else console.log("Connected to MySQL");
});

/* ------------ENDPOINTS-------- */

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

//#2 Som kund vill jag kunna se detaljerad information om en enskild produkt så att jag kan fatta köpbeslut

// Exempel: /products/5 -> req.params.id blir "5"
app.get("/products/:id", (req, res) => {
    const id = req.params.id;

    db.query("SELECT * FROM products WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result.length)
            return res.status(404).send("Produkten hittades inte");

        res.json(result[0]);
    });
});

// # 3 Som kund vill jag kunna slutföra ett köp/lägga en order så att jag kan genomföra mina inköp
app.post("/orders", (req, res) => {
    const { customer_id, items } = req.body;

    // 1) Valideringssteg
    if (!customer_id || !items || items.length === 0) {
        return res.status(400).send("customer_id och items krävs");
    }

    // 2) Skapa order (bara customer_id + datum)
    db.query(
        "INSERT INTO orders (customer_id, order_date) VALUES (?, NOW())",
        [customer_id],
        (err, orderResult) => {
            if (err) return res.status(500).send(err);

            const orderId = orderResult.insertId;

            // 3) Skapa order_items-rader
            const values = items.map((i) => [
                orderId,
                i.product_id,
                i.quantity,
            ]);

            db.query(
                "INSERT INTO order_items (order_id, product_id, quantity) VALUES ?",
                [values],
                (err2) => {
                    if (err2) return res.status(500).send(err2);

                    // 4) Svar
                    res.status(201).json({
                        message: "Order skapad!",
                        order_id: orderId,
                        customer_id,
                        items,
                    });
                },
            );
        },
    );
});

// # 4  Som kund vill jag kunna se mina tidigare ordrar så att jag har koll på min köphistorik
app.get("/orders/:id", (req, res) => {
    const id = req.params.id;

    const sql = `SELECT 
                o.id  AS ordernummer,
                p.sku AS artikelnummer, 
                p.product_name AS produkt, 
                oi.unit_price AS pris, 
                o.order_date AS orderdatum 
                FROM orders o
                JOIN order_items oi ON o.id=oi.order_id
                JOIN products p ON p.id=oi.product_id
                WHERE customer_id = ?
                ORDER BY orderdatum DESC;
                `;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result.length) return res.status(404).send("Inga ordrar hittades");

        res.json(result);
    });
});

// #5 Som kund vill jag kunna söka efter produkter så att jag snabbt kan hitta specifika varor
app.get("/products/search", async (req, res) => {
    const search = req.query.q;

    if (!search) {
        return res.status(400).json({ error: "Search query required" });
    }

    const sql = `
    SELECT id, product_name, price, sku, stock_quantity
    FROM products
    WHERE product_name LIKE CONCAT('%', ?, '%')
	ORDER BY product_name LIKE CONCAT(?, '%') DESC,
         product_name;
    LIMIT 100
  `;

    const [rows] = await db.execute(sql, [search, search]);
    res.json(rows);
});

// ================= STARTA SERVERN =================
// listen betyder: börja lyssna på en port (t.ex. 3000)
// utan app.listen kör servern inte och du kan inte anropa endpoints.
app.listen(process.env.PORT, () => {
    console.log("Server running on port", process.env.PORT);
});
