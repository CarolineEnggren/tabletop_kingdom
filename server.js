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
db.connect(err => {
	// err innehåller felinfo om något går fel (fel lösenord, db inte igång osv)
	if (err) console.log("DB error:", err);
	// annars, om allt gick bra så du direkt ser i terminalen om databasen funkar.
	else console.log("Connected to MySQL");
});

/* ------------ENDPOINTS--------- */
/* Som kund vill jag kunna se alla tillgängliga produkter så att jag kan bläddra i sortimentet
SELECT * FROM products;
 */

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

// ================= STARTA SERVERN =================
// listen betyder: börja lyssna på en port (t.ex. 3000)
// utan app.listen kör servern inte och du kan inte anropa endpoints.
app.listen(process.env.PORT, () => {
	console.log("Server running on port", process.env.PORT);
});
