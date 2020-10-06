const router = require('express').Router();
const counselorHandler = require('../handlers/counselor');

router.post('/login', counselorHandler.login);

router.post('/register', counselorHandler.createCounselor);

module.exports = router;