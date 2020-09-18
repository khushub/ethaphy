const router = require('express').Router();
const userHandler = require('../handlers/user');

router.post('/login', userHandler.login);

router.post('/register', userHandler.createUser);

router.get('/:id', userHandler.getUserById);

router.put('/forgotPassword', userHandler.forgotPassword);

router.put('/userUpdate',userHandler.userUpdate);

module.exports = router;