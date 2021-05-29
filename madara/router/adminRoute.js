const router = require('express').Router();
const adminHandler = require('../handlers/admin');


router.post('/register', adminHandler.register);

router.post('/login', adminHandler.login);

router.get('/usersList/:token', adminHandler.userList);

router.get('/counselorList/:token', adminHandler.counselorList);

router.post('/getCounselorProfile/:token', adminHandler.getCounselor);

router.post('/updateCounselor', adminHandler.updateCounselor);

module.exports = router;
