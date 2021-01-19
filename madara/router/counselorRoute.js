const router = require('express').Router();
const counselorHandler = require('../handlers/counselor');



router.post('/login', counselorHandler.login);

router.post('/register',counselorHandler.createCounselor);

router.post('/forgotPassword', counselorHandler.forgotPassword);

router.post('/verifyOTP', counselorHandler.verifyOTP);

router.get('/myProfile/:token', counselorHandler.getCounselor);

router.put('/changePassword/:token', counselorHandler.changePassword);

router.post('/setUpcomingSlots/:token', counselorHandler.setUpcomingSlots);

router.post('/weeklyAvailability/:token', counselorHandler.addWeeklyAvailability);

router.get('/getUpcomingSlots/:token', counselorHandler.getUpcomingSlots);

router.get('/getAllSlots/:token', counselorHandler.getAllSlots);

router.put('/disableSlotsByTime/:token', counselorHandler.disableSlotsByTime);

router.put('/disableSlotsByDate/:token', counselorHandler.disableSlotsByDate);

router.get('/potential/:token', counselorHandler.potential);

router.post('/acceptUser/:token', counselorHandler.userAssignment);

router.put('/introMessage/:token', counselorHandler.introMessage);

router.put('/upload/introVideo/:token', counselorHandler.uploadIntroVideo);

router.post('/getMessages/:token', counselorHandler.getMessages);


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