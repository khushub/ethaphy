const router = require('express').Router();
const userHandler = require('../handlers/user');
const stripeHandler = require('../handlers/addCard');

router.post('/login', userHandler.login);

router.post('/register', userHandler.createUser);

router.get('/:token', userHandler.getUserById);

router.post('/forgotPassword', userHandler.forgotPassword);

router.post('/verifyOTP', userHandler.verifyOTP);

router.put('/resetPassword/:token', userHandler.resetPassword);

router.put('/imageUpload/:token',userHandler.profilePictureUpload);

router.put('/nickNameUpdate/:token',userHandler.updateNickName);

//Stripe Related Routes

router.post('/viewAllPlan', userHandler.viewAllPlan);

router.post('/viewSinglePlan', userHandler.viewSinglePlan);

router.post('/cancelSubscription', userHandler.cancelSubscription);

router.post('/cardUpdate', userHandler.updateCard);

router.post('/updatePlan/:token', userHandler.updatePlan);

router.post('/addCard/:token', stripeHandler.addCard);

router.post('/currentMembership/:token', userHandler.getCurrentMembership);

router.post('/pastInvoices',userHandler.getPastInvoices);

// Scheduling related routes

router.post('/getEnableSlots', userHandler.getEnableSlots);

router.post('/bookSlots/:token', userHandler.bookSlots);


module.exports = router;