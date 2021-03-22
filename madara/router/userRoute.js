const router = require('express').Router();
const userHandler = require('../handlers/user');
const stripeHandler = require('../handlers/addCard');


// Dashboard route
router.post('/login', userHandler.login);

router.post('/register', userHandler.createUser);

router.get('/:token', userHandler.getUserById);

router.post('/forgotPassword', userHandler.forgotPassword);

router.post('/verifyOTP', userHandler.verifyOTP);

router.put('/resetPassword/:token', userHandler.resetPassword);

router.put('/imageUpload/:token',userHandler.profilePictureUpload);

router.put('/nickNameUpdate/:token',userHandler.updateNickName);

router.post('/switchCounselor/:token', userHandler.switchCounselor);

router.post('/counselorProfile/:token', userHandler.counselorProfile);

//Stripe Related Routes

router.post('/viewAllPlan', userHandler.viewAllPlan);

router.post('/viewSinglePlan', userHandler.viewSinglePlan);

router.post('/cancelSubscription/:token', userHandler.cancelSubscription);

router.post('/cardUpdate', userHandler.updateCard);

router.post('/updatePlan/:token', userHandler.updatePlan);

router.post('/addCard/:token', stripeHandler.addCard);

router.post('/currentMembership/:token', userHandler.getCurrentMembership);

router.post('/pastInvoices/:token',userHandler.getPastInvoices);

// Scheduling related routes

router.post('/getActiveSlots', userHandler.getActiveSlots);

router.post('/getActiveSlotsByDate/:token', userHandler.getActiveSlotByDate);

router.post('/bookSlots/:token', userHandler.bookSlots);

router.put('/cancelSession/:token', userHandler.cancelSession);

router.get('/getUpcomingSessions/:token', userHandler.getUpcomingSessions);


// file upload related routes
router.post('/upload/audio-video/:token',userHandler.audioVideoUpload);

router.post('/upload/attachment/:token', userHandler.attachment);

router.post('/getData', userHandler.getData);

module.exports = router;
