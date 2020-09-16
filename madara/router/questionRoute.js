const router = require('express').Router();
const userHandler = require('../handlers/user');


router.post('/questions', userHandler.questionRegister);

module.exports = router;