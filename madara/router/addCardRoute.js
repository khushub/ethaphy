const router = require('express').Router();
const addCardHandler = require('../handlers/addCard');

router.post('/', addCardHandler.addCard);

module.exports = router;