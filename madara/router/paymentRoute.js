const router = require('express').Router();
const paymentHandler = require('../handlers/payment');

router.post('/', paymentHandler.adddCard);

module.exports = router;