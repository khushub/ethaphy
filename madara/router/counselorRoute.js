const router = require('express').Router();
const counselorHandler = require('../handlers/counselor');



router.post('/login', counselorHandler.login);

router.post('/register',counselorHandler.createCounselor);

router.get('/:token', counselorHandler.getCounselor);

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