const router = require('express').Router();
const userHandler = require('../handlers/user');


router.post('/questions', userHandler.questionRegister);

router.get('/questions/:id', userHandler.getQuestionsById);

module.exports = router;