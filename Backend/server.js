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

//VIKTIGT: Utan den här raden kan vi inte läsa JSON i request body (req.body blir undefined)
app.use(express.json());

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
        cookie: { secure: false }, // true endast om HTTPS
    }),
);

/* ------------ENDPOINTS KUND-PERSPEKTIV-------- */

// Utökade funktioner kundperspektiv





// ================= STARTA SERVERN =================
// listen betyder: börja lyssna på en port (t.ex. 3000)
// utan app.listen kör servern inte och du kan inte anropa endpoints.
app.listen(process.env.PORT, () => {
    console.log("Server running on port", process.env.PORT);
});
