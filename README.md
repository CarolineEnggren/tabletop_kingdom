# Tabletop Kingdom

Ett skolprojekt i kursen **Databaser** med fokus på integration mellan databas och backend. Projektet implementerar en enkel webbshop för brädspel.

Projektet består av en **frontend** byggd med **HTML, CSS och JavaScript** samt en **backend** byggd med **Node.js och Express** som kommunicerar med en **MySQL-databas**.

Applikationen gör det möjligt för användare att:

- Se produkter
- Söka efter produkter
- Filtrera produkter efter kategori
- Visa detaljer om en produkt
- Lägga produkter i kundvagnen
- Ta bort produkter från kundvagnen
- Skapa ordrar

Projektet innehåller även en **admin-vy** där produkter kan hanteras (CRUD).

**Observera**

Frontend är **inte responsiv** och är endast designad för att visas korrekt på **desktop-skärmar**.

---

# Funktioner

## Kundfunktioner

- Visa alla produkter
- Söka efter produkter
- Filtrera produkter efter kategori
- Visa detaljer om en produkt
- Lägga produkter i kundvagn
- Ta bort produkter från kundvagnen
- Se totalsumma i kundvagnen
- Skapa en order (funktion finns i backend, ej i frontend)
- Se tidigare ordrar (funktion finns i backend, ej i frontend)

## Adminfunktioner

Admin kan:

- Skapa produkter
- Uppdatera produkter
- Ta bort produkter

Detta görs via **admin-vyn i frontend** som kommunicerar med backendens **admin-endpoints**.

---

# Projektstruktur

```
TABLETOP KINGDOM
│
├── Backend
│   ├── routes
│   │   ├── admin.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   └── products.js
│   │
│   ├── database.js
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── package-lock.json
│
├── Frontend
│   ├── assets
│   ├── app.js
│   ├── index.html
│   └── style.css
│
├── .gitignore
└── README.md
```

Backend-servern startas via **server.js** och innehåller olika routes för produkter, kundvagn, ordrar och adminfunktioner.

Frontend kommunicerar med backend via **fetch-anrop mot API:et**.

---

# Installation

## 1. Installera Node.js

Installera Node.js från:

https://nodejs.org

Kontrollera installationen:

```
node -v
npm -v
```

---

## 2. Installera dependencies

I **backend-mappen** kör:

```
npm install
```

Om paket saknas kan de installeras manuellt:

```
npm install express
npm install cors
npm install dotenv
npm install mysql2
```

---

# Starta servern

Gå till **backend-mappen** och starta servern:

```
node server.js
```

Servern startar då på:

```
http://localhost:3000
```

---

# Miljövariabler (.env)

Projektet använder en `.env`-fil för att dölja känslig information.

```
PORT=
SESSION_SECRET=
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
```

---

# API Endpoints

## Produkter

**GET /products**  
Hämtar alla produkter.

**GET /products/search?q=**  
Söker efter produkter.

**GET /products/category/:id**  
Hämtar produkter baserat på kategori.

**GET /products/:id**  
Hämtar detaljerad information om en produkt.

---

## Kundvagn

**POST /cart/add**  
Lägger till produkt i kundvagnen.

**GET /cart**  
Hämtar kundvagnen.

**DELETE /cart/:product_id**  
Tar bort produkt från kundvagnen.

---

## Orders

**POST /orders**  
Skapar en ny order.

**GET /orders/:id**  
Hämtar orderhistorik för en kund.

---

## Admin

**POST /admin/products**  
Skapar en produkt.

**PATCH /admin/products/:id**  
Uppdaterar en produkt.

**DELETE /admin/products/:id**  
Tar bort en produkt.

---

# Teknologier

## Frontend

- HTML
- CSS
- JavaScript

## Backend

- Node.js
- Express
- MySQL
- express-session
- CORS
- dotenv

---

# Begränsningar

- Frontend är **inte responsiv**
- Designad endast för **desktop**
- **Ingen autentisering** för admin
- **Ingen bildhantering** för produkter (placeholder används)

---

# Författare

Skolprojekt utvecklat som del av utbildningen Fullstackutvecklare på Teknikhögskolan av:
Caroline Enggren, Josefine Asplund & Sofie Törnqvist.
