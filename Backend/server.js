// Läser in variabler från .env-filen (t.ex. DB_USER, DB_PASSWORD)
// och gör dem tillgängliga via process.env
require("dotenv").config();

// Importerar Express-biblioteket så vi kan skapa en webbserver
// Hämtar Express-paketet från node_modules och gör det tillgängligt i den här filen
const express = require("express");

// Skapar en Express-applikation (själva servern)
// "app" är objektet vi använder för att skapa endpoints
// (VIKTIGT) Gör så att servern kan läsa JSON i request body
// UTAN den här blir req.body oftast undefined i POST/PATCH-requests
const app = express();

const db = require("./database");

// ========== SESSIONHANTERING (kundvagn / inloggning) ==========

// Importerar express-session, ett middleware som gör att servern
// kan spara data per användare mellan flera HTTP-requests
// Exempel: kundvagn, inloggningsstatus, användar-ID
const session = require("express-session");
app.use(
	session({
		secret: process.env.SESSION_SECRET, // En hemlig nyckel som används för att signera session-cookien
		resave: false,
		saveUninitialized: true,
	}),
);

/* ------------ENDPOINTS KUND-PERSPEKTIV-------- */

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
		if (err) return res.status(500).send(err);
		if (!result.length)
			return res.status(404).send("Produkten hittades inte");

		res.send(result[0]);
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
			const values = items.map(i => [orderId, i.product_id, i.quantity]);

			db.query(
				"INSERT INTO order_items (order_id, product_id, quantity) VALUES ?",
				[values],
				err2 => {
					if (err2) return res.status(500).send(err2);

					// 4) Svar
					res.status(201).send({
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
		if (err) return res.status(500).send(err);
		if (!result.length) return res.status(404).send("Inga ordrar hittades");

		res.send(result);
	});
});
// #5 Som kund vill jag kunna filtrera produkter efter kategori
app.get("/products/category/:id", (req, res) => {
	const categoryId = req.params.id;

	const sql = `
        SELECT 
            c.name AS kategori,
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

// #6 Som kund vill jag kunna söka efter produkter så att jag snabbt kan hitta specifika varor
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

// Utökade funktioner kundperspektiv

// #7 Som kund vill jag kunna lägga till produkter i varukorgen
app.post("/cart/add", (req, res) => {
	const { product_id, quantity } = req.body;
	if (!req.session.cart) {
		req.session.cart = [];
	}
	req.session.cart.push({ product_id, quantity });
	res.json({ message: "Produkt tillagd i varukorgen!" });
});

// #8 Som kund vill jag kunna se min varukorg med totalpris
app.get("/cart", (req, res) => {
	// Om varukorgen inte finns eller är tom
	if (!req.session.cart || req.session.cart.length === 0) {
		return res.json({
			cart: [],
			totalPrice: 0,
		});
	}

	const cart = req.session.cart;

	// Plocka ut alla produkt-id:n från varukorgen
	const productIds = cart.map(item => item.product_id);

	// Hämta produktinfo från databasen
	const sql = `
        SELECT id, product_name, price
        FROM products
        WHERE id IN (?)
    `;

	db.query(sql, [productIds], (err, products) => {
		if (err) return res.status(500).json(err);

		let totalPrice = 0;

		// Bygg en snygg varukorg att skicka till frontend
		// ---------------------------------------------Ska vi ha kvar den här biten?-----------------
		const detailedCart = cart.map(item => {
			const product = products.find(p => p.id === item.product_id);

			const itemTotal = product.price * item.quantity;
			totalPrice += itemTotal;

			return {
				product_id: product.id,
				product_name: product.product_name,
				price: product.price,
				quantity: item.quantity,
				itemTotal,
			};
		});

		res.json({
			cart: detailedCart,
			totalPrice,
		});
	});
});

// #9 Som kund vill jag kunna ta bort produkter från varukorgen

/*  Eftersom cart ligger i JavaScript/session och inte i MySQL måste jag själv se till 
att datatyper matchar, eftersom JS inte konverterar lika automatiskt som databasen. */

app.delete("/cart/:product_id", (req, res) => {
	const productId = Number(req.params.product_id);

	// Om varukorgen inte finns
	if (!req.session.cart || req.session.cart.length === 0) {
		return res.status(404).json({ message: "Varukorgen är tom." });
	}

	// Filtrera bort alla rader med samma product_id
	const beforeCount = req.session.cart.length;
	req.session.cart = req.session.cart.filter(
		item => Number(item.product_id) !== productId,
	);

	// Om inget togs bort betyder det att produkten inte fanns i varukorgen
	if (req.session.cart.length === beforeCount) {
		return res
			.status(404)
			.send({ message: "Produkten finns inte i varukorgen." });
	}

	res.send({ message: "Produkt borttagen från varukorgen!" });
});

// #10 Som kund vill jag kunna se om en produkt finns i lager
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

/* ------------ENDPOINTS ADMIN-PERSPEKTIV-------- */

//#1 Som admin vill jag kunna lägga till nya produkter så att sortimentet kan växa
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

// #2 Som admin vill jag kunna uppdatera produktinformation så att informationen hålls aktuell

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

// #3 Som admin vill jag kunna ta bort produkter så att utgående produkter kan rensas bort
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

// #4 Som admin vill jag kunna se alla ordrar så att jag kan hantera verksamheten
app.get("/admin/orders", (req, res) => {
	const sql = `
        SELECT 
            o.id,
            o.order_date,
            o.total_amount,
            c.first_name,
            c.last_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.order_date DESC
    `;

	db.query(sql, (err, results) => {
		if (err) return res.status(500).send(err);
		res.send(results);
	});
});

// ================= STARTA SERVERN =================
// listen betyder: börja lyssna på en port (t.ex. 3000)
// utan app.listen kör servern inte och du kan inte anropa endpoints.
app.listen(process.env.PORT, () => {
	console.log("Server running on port", process.env.PORT);
});
