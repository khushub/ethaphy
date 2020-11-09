const router = require('express').Router();
const userHandler = require('../handlers/user');

router.post('/login', userHandler.login);

router.post('/register', userHandler.createUser);

router.get('/:token', userHandler.getUserById);

router.post('/forgotPassword', userHandler.forgotPassword);

router.post('/verifyOTP', userHandler.verifyOTP);

router.put('/resetPassword/:token', userHandler.resetPassword);

router.put('/imageUpload/:token',userHandler.profilePictureUpload);

router.post('/viewAllPlan', userHandler.viewAllPlan);

router.post('/cancelTrial/:stripeCustomerId', userHandler.cancelTrial);

router.post('/cardUpdate/:stripeCustomerId', userHandler.updateCard);

router.post('/subscribePlan/:stripeCustomerId', userHandler.subscribePlan);

module.exports = router;