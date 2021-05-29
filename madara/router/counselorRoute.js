const router = require('express').Router();
const counselorHandler = require('../handlers/counselor');


// profile section
router.post('/login', counselorHandler.login);

router.post('/register',counselorHandler.createCounselor);

router.post('/forgotPassword', counselorHandler.forgotPassword);

router.post('/verifyOTP', counselorHandler.verifyOTP);

router.get('/myProfile/:token', counselorHandler.getCounselor);

router.put('/changePassword/:token', counselorHandler.changePassword);

router.put('/editProfile/:token', counselorHandler.editProfile);

router.put('/updateProfilePicture/:token', counselorHandler.updateProfilePicture);

router.post('/addCategory/:token', counselorHandler.addCategory);

router.get('/getCategory/:token', counselorHandler.getCategory);

router.put('/deleteCategory/:token', counselorHandler.deleteCategory);

router.get('/logout/:token', counselorHandler.logout);


// scheduling related routes
router.post('/filterByDate/:token', counselorHandler.filterByDate);

router.post('/weeklyAvailability/:token', counselorHandler.addWeeklyAvailability);

router.post('/getUpcomingSlots/:token', counselorHandler.getUpcomingSlots);

router.get('/getUpcomingSession/:token', counselorHandler.getSlotForAWeek);

router.get('/getBookingsForCal/:token', counselorHandler.forCalendar);

router.put('/disableSlotsByTime/:token', counselorHandler.disableSlotsByTime);

router.put('/disableSlotsByDate/:token', counselorHandler.disableSlotsByDate);

router.post('/userUpcomingSessions/:token', counselorHandler.getUpcomingSessionsForaUser);

router.post('/getLatestSession/:token', counselorHandler.getLatestSession);

router.post('/bookSession/:token',counselorHandler.bookSession);

router.put('/cancelSession/:token', counselorHandler.cancelSession);


// dashboard
router.get('/todayPlan/:token', counselorHandler.todayPlan);

router.get('/potential/:token', counselorHandler.potential);

router.post('/acceptUser/:token', counselorHandler.userAssignment);

router.get('/inbox/:token', counselorHandler.inbox);

router.put('/action/:token', counselorHandler.action);

router.get('/count/:token', counselorHandler.getCount);

router.get('/draftList/:token', counselorHandler.getDraftList);

router.post('/sendDraft/:token', counselorHandler.sendDraft);


// update and file upload related routes

router.put('/introMessage/:token', counselorHandler.introMessage);

router.put('/upload/introVideo/:token', counselorHandler.uploadIntroVideo);

router.post('/upload/audio/:token', counselorHandler.uploadAudios);

router.get('/getAudios/:token', counselorHandler.getUploadedAudios);

router.put('/deleteAudio/:token', counselorHandler.deleteAudio);

router.post('/upload/document/:token', counselorHandler.uploadDocument);

router.get('/getDocument/:token', counselorHandler.getDocument);

router.put('/deleteDoc/:token',  counselorHandler.deleteDocument);



// payment related routes
router.get('/exchnageCount/:token', counselorHandler.exchangeCount);

router.get('/payment/:token', counselorHandler.getPayment)

module.exports = router;








// const multer = require('multer');


// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null,'./uploads/');
//     },
  
//     filename: (req, file, cb) => {
//       let originalname = file.originalname;
//       let extension = originalname.split(".");
//       filename = Date.now() + "." + extension[extension.length - 1];
//       cb(null, filename);
//     },
//   });
  
  
//   const fileFilter = (req, file, cb) => {
//     if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png'|| file.mimetype == 'image/jpg') {
//       cb(null, true);
//     } else {
//       cb(null, false);
//     }
//   }
  
//   const upload = multer({ storage : storage, fileFilter :fileFilter });