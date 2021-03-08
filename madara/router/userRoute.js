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

//Stripe Related Routes

router.post('/viewAllPlan', userHandler.viewAllPlan);

router.post('/viewSinglePlan', userHandler.viewSinglePlan);

router.post('/cancelSubscription/:token', userHandler.cancelSubscription);

router.post('/cardUpdate', userHandler.updateCard);

router.post('/updatePlan/:token', userHandler.updatePlan);

router.post('/addCard/:token', stripeHandler.addCard);

router.post('/currentMembership/:token', userHandler.getCurrentMembership);

router.post('/pastInvoices',userHandler.getPastInvoices);

// Scheduling related routes

router.post('/getActiveSlots', userHandler.getActiveSlots);

router.post('/getActiveSlotsByDate', userHandler.getActiveSlotByDate);

router.post('/bookSlots/:token', userHandler.bookSlots);


// file upload related routes
router.post('/upload/audio-video/:token',userHandler.audioVideoUpload);

router.post('/upload/attachment/:token', userHandler.attachment);

module.exports = router;





























// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null,'./uploads/');
//   },

//   filename: (req, file, cb) => {
//     let originalname = file.originalname;
//     let extension = originalname.split(".");
//     filename = Date.now() + "." + extension[extension.length - 1];
//     cb(null, filename);
//   },
  
// });


//   const fileFilter = (req, file, cb) => {
//     if (file.mimetype == 'video/mp4' || file.mimetype == 'audio/mpeg') {
//       cb(null, true);
//     } 
//     else {
//         cb(null, false)
//         cb(new Error('only mp3 or mp4 files are allowed'));
//     }
//   }

// const upload = multer({ storage : storage, fileFilter : (req, file, cb) => {
//   if (file.mimetype == 'video/mp4' || file.mimetype == 'audio/mpeg') {
//     cb(null, true);
//   } 
//   else {
//       // cb(null, false);
//       return cb(new Error('only mp4 or mp3/mpeg files are allowed'));
//   }
// }}).single('file');



// router.post('/attachment',
//   multer({
//     storage: storage,
//     fileFilter: (req, file, cb) => {
//       if (file.mimetype == 'application/pdf' || file.mimetype == 'text/plain') {
//         cb(null, true);
//       }
//       else {
//         // cb(null, false)
//          cb(new Error('only pdf or txt files are allowed'));
//       }
//     }
//   })
//     .single('file'),
//   userHandler.attachment
// )
