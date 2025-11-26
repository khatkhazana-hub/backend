const express = require("express");
const { createPaymentIntent, confirmPayment } = require("../controllers/checkout.controller");

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);
router.post("/confirm", confirmPayment);

module.exports = router;
