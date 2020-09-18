const router = require('express').Router();
const userHandler = require('../handlers/user');


router.post('/', userHandler.questionRegister);

router.get('/', userHandler.getQuestions);

module.exports = router;