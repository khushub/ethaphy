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

//Stripe Related Routes

router.post('/viewAllPlan', userHandler.viewAllPlan);

router.post('/cancelTrial/:stripeCustomerId', userHandler.cancelTrial);

router.post('/cardUpdate/:stripeCustomerId', userHandler.updateCard);

router.post('/subscribePlan/:token', userHandler.subscribePlan);

router.post('/addCard', stripeHandler.addCard);





module.exports = router;