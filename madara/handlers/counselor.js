const Helper = require('../handlers/helper');
var logger = require('log4js').getLogger();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Chat = require('../models/chatModel');

// required model
const Counselor = require('../models/counselorModel');
const Slot = require('../models/slotModel');
const CounselorToUser = require('../models/counselorToUser');
const OTP = require('../models/otpModel');
const userModel = require('../models/userModel');



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if(file.mimetype== 'image/jpeg' || file.mimetype == 'image/png'|| file.mimetype == 'image/jpg'){
      cb(null,'./uploads/');
    }
    if(file.mimetype == 'video/mp4'){
      cb(null,'./uploads/introMessage');
    }
  },

  filename: (req, file, cb) => {
    let originalname = file.originalname;
    let extension = originalname.split(".");
    filename = Date.now() + "." + extension[extension.length - 1];
    cb(null, filename);
  },
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png'|| file.mimetype == 'image/jpg') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const upload = multer({ storage : storage, fileFilter :fileFilter }).single('photo');


// Counselor Registeration

module.exports.createCounselor = async function (req, res) {
    upload(req, res, (err) => {
      if (err) {
        console.log(err);
        res.send({error : err, success : false, message : "file upload error"})
      }
      else {
        try {
          // check if all field is available
          //   const { username, email, password } = req.body;
          //   if (!username || !email || !password) {
          //     return res.send({data : {}, error: "username or email or password is missing", success : false }).status(400);
          //   }
  
          // check if user exist
           Counselor.findOne({ $and: [{ email: req.body.email, username: req.body.username }] })
            .then(counselor => {
              if (!counselor) {
                const counselor = new Counselor({
                  firstName: req.body.firstName,
                  lastName: req.body.lastName,
                  userName: req.body.userName,
                  email: req.body.email,
                  mobileNumber: req.body.mobileNumber,
                  address: req.body.address,
                  password: Helper.hashPassword(req.body.password),
                  role: req.body.role,
                  status: req.body.status,
                  deleted: req.body.deleted,
                  affirmation: req.body.affirmation,
                  licensingState: req.body.licensingState,
                  licenseNumber: req.body.licenseNumber,
                  licenseLink: req.body.licenseLink,
                  licenseReview: req.body.licenseReview,
                  serviceProviding: req.body.serviceProviding,
                  genderApplies: req.body.genderApplies,
                  languages: req.body.languages,
  
                  photo : req.file.path,
  
                  designations: req.body.designations,
                  specialities: req.body.specialities,
                  aboutMe: req.body.aboutMe,
                  personalQuote: req.body.personalQuote,
                  practiceYears: req.body.practiceYears,
                  attendedSchool: req.body.attendedSchool,
                  graduatedYear: req.body.graduatedYear,
                  howYouhearAboutUs: req.body.howYouhearAboutUs,
                  fcmToken : req.body.fcmToken               
             });
                // let mailTransport = nodemailer.createTransport({
                //   service : 'gmail',
                //   auth :{
                //     user : 'edwy23@gmail.com',
                //     pass : '***********'
                //   }
                // });
  
                // let mailDetails = {
                //   from : 'edwy23@gmail.com',
                //   to : req.body.email,
                //   subject : 'Registration Success mail',
                //   text : ' You successfully registered to Etherapthy Pro'
                // }
  
                counselor.save((error, response) => {
                  if (error) {
                    res.send({ 
                      data: {}, 
                      error: error.message, 
                      message: "date save error : username or email already taken"
                     }).status(500);
                  }
                  else {
                    const token = Helper.generateregisterationToken(response.id);
                    let data = {
                      response,
                      token
                    }
                    // mailTransport.sendMail(mailDetails, (error, response) =>{
                    //   if(error){
                    //     res.send({data : {}, success : false, error, message :'Error in mail send in user registration'});
                    //   }
                    //   else{
                    //     res.send({data: data, success: true, message: "Counselor Registered and mail send to registered email"});
                    //   }
                    // });
                    res.send({data});
                  }
                })
              }
              else {
                return res.send({ data: {}, success: false, message: "username or email already taken" }).status(402);
              }
            })
            .catch(error => {
              res.send({ error: error, message: "required field/s missing" }).status(500);
            })
        }
        catch (error) {
          res.send({ error: error.message, message: "Error while registration" }).status(500);
        }
      }
    })
  }


// Counselor login

  module.exports.login = function (req, res) {
    try {
      const { email, password } = req.body;
      console.log(req.body);
  
      /* condition for email, password are not null */
  
      if (!email || !password) {
        return res.send({
          data : {},
          status: "fail",
          fail: {
            errorCode: 400,
            message: "email or password missing"
          }
        });
      };
  
  
      Counselor.findOne({ email: req.body.email }, function (err, details) {
        if (err) {
          logger.error('login: DBError in finding user details.');
          return;
        }
        if (!details) {
          return res.send({ error: err, success: false  ,message: "No counselor exist with this email"}).status(401);
        }
  
        /* condition for compare password with counselor table data */
  
        if (!Helper.comparePassword(details.password, password)) {
          return res.send({data : {}, error: "Invalid Password" , success : false}).status(403);
        };
  
        logger.info('login: ' + details.email + ' logged in.');
        details.fcmToken = req.body.fcmToken;
        details.save().then(doc => console.log("doument: ", doc));
        const token = Helper.generateToken(details._id);
        const data = {
          details,
          token
        }
        return res.send({ data: data,success : true, message: "Counselor login success" }).status(200);
      })
    }
    catch (error) {
      res.send({ error: error.message }).status(500);
    }
  };


  module.exports.getCounselor = (req, res) =>{
    try {
      let {userId} = jwt.decode(req.params.token);
      Counselor.findById(userId, (error, doc) =>{
        if(error){
          res.send({data : {}, success : false, message : error.message});
        }
        if(!doc){
          res.send({data : {}, success : false, message : "No counselor exist. somthing wrong with token"});
        }
        else{
          res.send({data : doc, success : true, message : "Counselor fetched successfully"});
        }
      })
    } 
    catch (error) {
      res.send({data : {}, success : false,error, message : "Something gone wrong while decoding token"});
    }
  }



//upload intro message 

module.exports.introMessage = async (req, res) =>{
  try {
    // let id = jwt.decode(req.params.token);
    let id = req.params.token;
    Counselor.findOneAndUpdate({_id : id},
      [{$set : {
        introMessage : req.body.introMessage
      }
    }], {returnNewDocument : true, upsert : true})
    .then(doc =>{
      res.send({data : doc, success : true, message : "intro message saved"});
    })
    .catch(error =>{
      res.send({error, success : false , message : "DB error: intro message save"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}


// upload intro video

module.exports.uploadIntroVideo = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    console.log("userId",userId);
    await Counselor.findById(userId)
    .then(counselor =>{
      console.log("counselor: ", counselor);
      try {
        const fileFilter = (req, file, cb) =>{
          if(file.mimetype === 'video/mp4'){
            cb(null, true)
          }
          else{
            return cb(new Error('only mp4 files are allowed'));
          }
        };
        const upload = multer({storage : storage, fileFilter : fileFilter}).single('file');
        upload(req, res, (error) =>{
          if(error){
            res.send({error, success : false, message : "only mp4 files are allowed"});
          }
          else{
            counselor.introVideo = req.file.filename;
            counselor.save()
            .then(doc =>{
              res.send({data : doc, success : true, message : "video uploaded"});
            })
            .catch(error =>{
              res.send({error, success : false, message : "DB error: intro video save"});
            })
          }
        })  
      } 
      catch (error) {
        res.send({error, successc : false, message : "file upload error"});
      }
    })
    .catch(error =>{
      res.send({error, successc : false, message : "NO counselor found"})
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}


// Adding time slot from counselor end for a week
 
module.exports.addTimeSlot = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token); // sepearting userid of counselor from  token

    // first delete all previous slots for that counselor
    await Slot.deleteMany({counselorId : userId})
    .then(result =>{
      console.log("result", result);
    })
    .catch(error => {
      console.log("error: ", error);
    })


    const daysArray = req.body.daysArray;  // array of availibility of days 

    const startTimeArray = req.body.startTimeArray; // start time array of days

    const endTimeArray = req.body.endTimeArray;     // end time array of days

    // inserting doc in db for each day    
    let i = 0;
    daysArray.forEach((day) => {
      let date = new Date(startTimeArray[i]);
      console.log("date: ",date.toUTCString());

      // do sloting here
      let slot = [];
      let timeSlot = [];
      let j = 0;
      let compareTime = date.getTime();
      // console.log("comparetime: ", compareTime);

      while (new Date(endTimeArray[i]).getTime() >= compareTime) {
        slot[j] = date.setMinutes(date.getMinutes() + 30);

        // formatting unix time_stamp to date_time 
        let dt = new Date(compareTime);
        compareTime = slot[j];

        let time = dt.getHours() + ':' + dt.getMinutes();
        timeSlot[j] = time;
        j++;
      }
      // console.log("time slot: ", timeSlot);
      // inserting slot timing in DB
      const slotDB = new Slot({
        counselorId: userId,
        day: day,
        date : startTimeArray[i],
        slot: timeSlot.map((time, index, array) => {
          if (array[index + 1] !== undefined) return { status: 0, time: time + "-" + array[index + 1] };
        })
          .filter((time) => {
            return time !== undefined;
          })
      });
      slotDB.save()
        .then(response => {
          console.log("response", response);
        })
        .catch(error => {
          console.log("error", error);
          res.send({ error: error, success: false, message: "error at sloting" });
        })
        i++;
    });
    res.send({ data: {}, success : true, message: "testing" });
  }
  catch (error) {
    res.send({ error: error, message: "something gone wrong while scheduling" });
  }
}


module.exports.getAllSlots = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Slot.find({counselorId : userId}, (error, doc) =>{
      if(error){
        res.send({error : error, success : false, message : "DB error"});
      }
      else{
        if(!doc){
          res.send({data : {}, success : false, message : "no data found: No data in DB or incorrect token"});
        }
        else{
          let slots = [];
          for(let i=0; i<doc.length;i++){
            slots[i] = doc[i].slot;
          }
          
          res.send({slots, success : true, message : "got all data"});
        }
      }
    })
  }
   catch (error) {
    res.send({error : error, success : false, message : "Invalid request : something is wrong with request"});
  }
}


module.exports.disableSlotsByTime = (req, res) => {
  try {
    const daysArray = req.body.days;
    const slotsArray = req.body.slots;
    let { userId } = jwt.decode(req.params.token);
    slotsArray.forEach(slot => {
      console.log("slot: ",slot);
      res.send({slot});
    });
  }
  catch (error) {
    res.send({ error: error, success: false, message: "Invalid request : something is wrong with request" });
  }
}


module.exports.disableSlotsByDay = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    console.log(`userId: ${userId}`);
    let day = req.body.day;
    Slot.findOneAndUpdate({ $and: [{ counselorId: userId }, { day: day }] },
      { $set: { status: 'inactive' } },
      { new: true },
      (error, doc) => {
        if (error) {
          console.log(`error in DB: ${error}`);
          res.send({ error: error, success: false, message: "DB error" });
        }
        else {
          if (!doc) {
            console.log("no data found");
            res.send({ data: {}, success: false, message: "no data found" });
          }
          else {
            // console.log("status disabled of this date", doc);
            res.send({ data: doc, success: true, message: "time slot disabled for a day" });
          }
        }
      })
  }
  catch (error) {
    res.send({ error: error, success: false, message: "Invalid request or incorrect token" });
  }
}



// Potential functionality

module.exports.potential = async (req, res) =>{
  try {
    await Chat.find({counsellor_id : "5fc9cb88db493e26f44e9622"})
    .then(docs =>{
      // console.log("docs: ", docs.length);
      let potential = [];
      for(let i=0; i< docs.length; i++){
        console.log("docs[i] : ",docs[i]);
        potential[i] = {
          userName : docs[i].username,
          userImage : docs[i].user_image,
          userId : docs[i].user_id
 
        }
        console.log("potenrial[i] : ", potential[i]);
      }
      res.send({data : potential, success : false , message : "potential fetched"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : 'unknown error: might be db error'});
  }
}


// accept a user

module.exports.userAssignment = async (req, res) =>{
  try {
      // let counselorId = jwt.decode(req.params.token);
      let counselorId = req.params.token;
      let userId = req.body.userId
      console.log("counselor: ", counselorId, " userId: ", userId);
      let counselorData = await Counselor.findById(counselorId);
      console.log("counselorData: ",counselorData.introMessage);
      let assignmentData = new CounselorToUser({
        counselorId : counselorId,
        userId : userId
      });
      await assignmentData.save()
      .then(async (doc) =>{
        console.log("doc: ", doc);
        await Chat.findOneAndUpdate({ user_id: req.body.userId },
          [{$set : {
            counsellor_id : counselorId,
            counsellorname : req.body.counselorName,
            joinId : req.body.userId + "-" + counselorId,
            message : counselorData.introMessage ? counselorData.introMessage : ""
          }
        }], {new : true})
        .then(chat =>{
          console.log("chat : ", chat);
          res.send({thread : chat,success : true, message : "counselor assing to user"});
        })
        .catch(error =>{
          res.send({error, success : false , message : "DB error : thread data save error"});
        }) 
      })
      .catch(error =>{
        res.send({error, success : false, message : "DB error in counselor assingment"});
      })
  } 
  catch (error) {
    res.send({error, success : false, message : "something goes wrong in counselor assignment"});
  }
}


// get messages for a user

module.exports.getMessages = async (req, res) => {
  try {
    await userModel.findById(req.body.userId)
      .then(async (user) => {
        await Chat.findOne({ user_id: req.body.userId })
          .then(async (thread) => {
            const slot = await CounselorToUser.find({userId : req.body.userId});

            let data = await thread.toJSON();
            data.status = user.status;
            data.slots = {
              time : slot[0].slots,
              date : slot[0].date
            };
            res.send({ data, success: true, message: "Messages fetched" });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error: No user found" });
          })
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error: NO user exist" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error" });
  }
}


// forgot password functionality

module.exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    await Counselor.findOne({ email: email }, async (error, doc) => {
      if (error || !doc) {
        res.send({ error: error, success: false, message: 'DB error: no counselor exists' });
      }
      else {
        // console.log("doc: ", doc);
        let otp = Math.floor(Math.random() * 100000);
        let mailTransport = await nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'rahul.168607@knit.ac.in',
            pass: '8126123782'
          }
        });

        let mailDetails = {
          from: 'rahul.168607@knit.ac.in',
          to: email,
          subject: 'Test mail',
          text: otp.toString()
        }
        console.log(" maildetails: ", mailDetails);
        await mailTransport.sendMail(mailDetails, async (error, response)=>{
          if(error || !response){
            res.send({error : error, success : false, message: "Error in mail send : OTP" });
          }
          else{
            OTP.findOneAndUpdate({email : email}, {email : email, otp : otp}, {upsert : true, new : true})
            .then(doc =>{
              res.send({response : response, success : true, message : "OTP sent to your mail"});
            })
            .catch(error=>{
              res.send({error, success : false, message : "DB error in otp data save"});
            })
          }
        })
      }
    })
  }
  catch (error) {
    res.send({ error: error.message, message: 'Error at forgot password', success: true });
  }
}






// OTP Verification

module.exports.verifyOTP = (req, res) =>{
  try {
    OTP.findOne({email : req.body.email})
    .then(doc =>{
      if(doc.otp === req.body.otp){
        let password = req.body.password;
        let confirmPassword = req.body.confirmPassword;
        if(password === confirmPassword){
          password = Helper.hashPassword(password);
          Counselor.findOneAndUpdate({email : req.body.email}, {password : password}, {new : true})
          .then(user =>{
            res.send({data : user, success : true, message : "Password update success"});
          })
          .catch(error =>{
            res.send({error, success : false, message : "DB error: password update"});
          })
        }
        else{
          res.send({data : {},success : false, message : "mismatch password and confirmPassword"});
        }
      }
      else{
        res.send({success : false, message : "incorrect otp"});
      }
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: no user found"});
    })  
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error: forgot password"});
  }
}











 // Do scheduling here

//  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

//  let from_time = req.body.from_time;
//  let to_time = req.body.to_time;
//  let day = days[new Date(from_time).getDay()-1];
//  console.log("day is : ",day);


//  // check if start_time exceed end_time

//  if (new Date(from_time).getTime() < new Date(to_time).getTime()) {
  //  let date = new Date(from_time);
  //  // console.log("date: ",date.toTimeString().substring(0,5));

  //  // do sloting here
  //  let slot = [];
  //  let timeSlot = [];
  //  let i = 0;
  //  let compareTime = date.getTime();
  //  // console.log("date: ",date, "  slot: ",slot, "  compare time: ", compareTime);

  //  while (new Date(to_time).getTime() >= compareTime) {
  //    slot[i] = date.setMinutes(date.getMinutes() + 30);

  //    // formatting unix time_stamp to date_time 
  //    let dt = new Date(compareTime);
  //    compareTime = slot[i];
  //    // let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  //    let time = dt.getHours() + ':' + dt.getMinutes();
  //    timeSlot[i] = time;
  //    i++;
  //  }

  //  // inserting slot timing in DB
  //  let { userId } = jwt.decode(req.params.token);
  //  const slotDB = new Slot({
  //    counselorId: userId,
  //    date: date.toDateString(),
  //    slot: timeSlot.map((time, index, array) => {
  //             if (array[index + 1] !== undefined) 
  //              return { status: 0, time: time.substring(0, 5) + "-" + array[index + 1] };
  //             })
  //             .filter((time) => {
  //                return time !== undefined;
  //             })
  //          });
  //    slotDB.save()
  //    .then(response => {
  //      // console.log("response", response);
  //      // res.send({data : response, success : true, message : "time slot added"});
  //      res.send({ data: timeSlot, message: "testing" });
  //    })
  //    .catch(error => {
  //      console.log("error", error);
  //      res.send({ error: error, success: false, message: "error at sloting" });
  //    })
//  }
//  else {
//    if (new Date(from_time).getTime() > new Date(to_time).getTime()) {
//      console.log("start time must not exceed end time");
//    }
//    else {
//      console.log("Both start and end time are same");
//    }
//  }






// module.exports.createCounselor = async function (req, res) {
//   upload(req, res, (err) => {
//     if (err) {
//       console.log(err);
//       res.send({error : err, success : false, message : "file upload error"})
//     }
//     else {
//       try {
//         // check if all field is available
//         //   const { username, email, password } = req.body;
//         //   if (!username || !email || !password) {
//         //     return res.send({data : {}, error: "username or email or password is missing", success : false }).status(400);
//         //   }

//         // check if user exist
//          Counselor.findOne({ $and: [{ email: req.body.email, username: req.body.username }] })
//           .then(counselor => {
//             console.log("counselor in then: ", counselor);
//             if (!counselor) {
//               const counselor = new Counselor({
//                 firstName: req.body.firstName,
//                 lastName: req.body.lastName,
//                 userName: req.body.userName,
//                 email: req.body.email,
//                 mobileNumber: req.body.mobileNumber,
//                 address: req.body.address,
//                 password: Helper.hashPassword(req.body.password),
//                 role: req.body.role,
//                 status: req.body.status,
//                 deleted: req.body.deleted,
//                 affirmation: req.body.affirmation,
//                 licensingState: req.body.licensingState,
//                 licenseNumber: req.body.licenseNumber,
//                 licenseLink: req.body.licenseLink,
//                 licenseReview: req.body.licenseReview,
//                 serviceProviding: req.body.serviceProviding,
//                 genderApplies: req.body.genderApplies,
//                 languages: req.body.languages,

//                 photo : req.file.path,

//                 designations: req.body.designations,
//                 specialities: req.body.specialities,
//                 aboutMe: req.body.aboutMe,
//                 personalQuote: req.body.personalQuote,
//                 practiceYears: req.body.practiceYears,
//                 attendedSchool: req.body.attendedSchool,
//                 graduatedYear: req.body.graduatedYear,
//                 howYouhearAboutUs: req.body.howYouhearAboutUs,
//                 fcmToken : req.body.fcmToken 
//               });

//               // let mailTransport = nodemailer.createTransport({
//               //   service : 'gmail',
//               //   auth :{
//               //     user : 'edwy23@gmail.com',
//               //     pass : '***********'
//               //   }
//               // });

//               // let mailDetails = {
//               //   from : 'edwy23@gmail.com',
//               //   to : req.body.email,
//               //   subject : 'Registration Success mail',
//               //   text : ' You successfully registered to Etherapthy Pro'
//               // }

//               counselor.save((error, response) => {
//                 if (error) {
//                   res.send({ data: {}, error: error.message, message: "username or email already taken in save" }).status(500);
//                 }
//                 else {
//                   const token = Helper.generateregisterationToken(response.id);
//                   let data = {
//                     response,
//                     token
//                   }
//                   // mailTransport.sendMail(mailDetails, (error, response) =>{
//                   //   if(error){
//                   //     res.send({data : {}, success : false, error, message :'Error in mail send in user registration'});
//                   //   }
//                   //   else{
//                   //     res.send({data: data, success: true, message: "Counselor Registered and mail send to registered email"});
//                   //   }
//                   // });
//                   res.send({data});
//                 }
//               })
//             }
//             else {
//               return res.send({ data: {}, success: false, message: "username or email already taken" }).status(402);
//             }
//           })
//           .catch(error => {
//             res.send({ error: error, message: "required field/s missing" }).status(500);
//           })
//       }
//       catch (error) {
//         res.send({ error: error.message, message: "Error while registration" }).status(500);
//       }
//     }
//   })
// }

