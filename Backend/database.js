// Importerar mysql2-biblioteket för att kunna koppla Node.js till MySQL
const mysql = require("mysql2");

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

module.exports = db;
