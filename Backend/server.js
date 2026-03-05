require("dotenv").config(); // Läser in variabler från .env (t.ex. PORT, SESSION_SECRET)

const express = require("express"); // Importerar Express-biblioteket som används för att skapa webservern.
const app = express(); // Skapar en Express-app som vi kan lägga till "middleware" och "routers" på.

// Middleware som gör att Express kan läsa JSON-body i POST/PATCH/PUT requests.
// Utan den blir req.body oftast undefined.
app.use(express.json());

// ========== SESSION (kundvagn) ==========
/**
 * express-session skapar en session per användare.
 * Servern skickar en cookie (session-id) till webbläsaren.
 * Nästa request från samma användare skickar med cookien,
 * och då kan vi hämta deras sparade session-data (t.ex. kundvagn).
 */
const session = require("express-session");
app.use(
    session({
        secret: process.env.SESSION_SECRET, // Hemlig nyckel som signerar session-cookien
        resave: false, // Spara inte sessionen om den inte ändrats
        saveUninitialized: true, // Skapa session även för nya besökare (som inte har en session än)
        cookie: { secure: false }, // secure:true kräver HTTPS
    }),
);

// ========== CORS ==========
/**
 * CORS behövs när frontend och backend kör på olika "origin", (t.ex. olika portar).
 * credentials:true tillåter cookies (session).
 */
const cors = require("cors");
app.use(
    cors({
        origin: true, // speglar request-origin
        credentials: true,
    }),
);

// ========== ROUTERS ==========
// Importerar och mountar alla routers (endpoints) från "routes"-mappen.
const productsRouter = require("./routes/products");
const cartRouter = require("./routes/cart");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");

app.use("/products", productsRouter);
app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);
app.use("/admin", adminRouter);

// ========== STARTA SERVER ==========
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log("Server running on port", port);
});
