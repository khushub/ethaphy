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

router.post('/cancelSubscription/:token', userHandler.cancelSubscription);

router.post('/cardUpdate', userHandler.updateCard);

router.post('/updatePlan/:token', userHandler.updatePlan);

router.post('/addCard', stripeHandler.addCard);

router.post('/currentMembership/', userHandler.getCurrentMembership);



module.exports = router;