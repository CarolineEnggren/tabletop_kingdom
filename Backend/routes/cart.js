const express = require("express");
const router = express.Router();
const db = require("../database");

// ++ #8 Som kund vill jag kunna lägga till produkter i varukorgen
// /cart/add
router.post("/add", (req, res) => {
    const { product_id, quantity } = req.body;

    if (!req.session.cart) {
        req.session.cart = [];
    }
    req.session.cart.push({ product_id, quantity });

    req.session.save((err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Produkt tillagd i varukorgen!" });
    });
});

// ++ #9 Som kund vill jag kunna se min varukorg med totalpris
// /cart/
router.get("/", (req, res) => {
    const cart = req.session.cart || [];
    // Om varukorgen inte finns eller är tom
    if (cart.length === 0) {
        return res.json({
            message: "Varukorgen är tom",
            cart: [],
            totalPrice: 0,
        });
    }

    // Plocka ut alla produkt-id:n från varukorgen
    const productIds = cart.map((item) => item.product_id);

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
        const detailedCart = cart.map((item) => {
            const product = products.find((p) => p.id === item.product_id);

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

// ++ #10 Som kund vill jag kunna ta bort produkter från varukorgen

/*  Eftersom cart ligger i JavaScript/session och inte i MySQL måste jag själv se till 
att datatyper matchar med "Number", eftersom JS inte konverterar lika automatiskt som databasen. */
// /cart/:product_id
router.delete("/:product_id", (req, res) => {
    const productId = Number(req.params.product_id);

    // Om varukorgen inte finns
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(404).json({ message: "Varukorgen är tom." });
    }

    // Filtrera bort alla rader med samma product_id
    const beforeCount = req.session.cart.length;
    req.session.cart = req.session.cart.filter(
        (item) => Number(item.product_id) !== productId,
    );

    // Om inget togs bort betyder det att produkten inte fanns i varukorgen
    if (req.session.cart.length === beforeCount) {
        return res
            .status(404)
            .send({ message: "Produkten finns inte i varukorgen." });
    }

    res.send({ message: "Produkt borttagen från varukorgen!" });
});

module.exports = router;
