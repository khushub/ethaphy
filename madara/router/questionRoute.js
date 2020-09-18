const router = require('express').Router();
const userHandler = require('../handlers/user');


router.get('/', userHandler.getQuestions);

module.exports = router;