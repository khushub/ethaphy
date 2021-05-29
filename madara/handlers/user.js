// required modules
const myEnv = require('dotenv').config();

var mongoose = require('mongoose');
var logger = require('log4js').getLogger();
const Helper = require('./helper');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');


// require util file
const mailSend = require('./util');


// required models
// const Login = require('../models/loginModel');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
const OTP = require('../models/otpModel');
const CounselorToUser = require('../models/counselorToUser');
const Counselor = require('../models/counselorModel');
const UpcomingSlots = require('../models/upcomingAvailability');
const Chat = require('../models/chatModel');


// required Stripe modules 

// const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;
const Stripe = require('stripe');
const stripe = Stripe(secretKey);



module.exports.login = async function (req, res, next) {
  try {
    const { username, password } = req.body;
    console.log(req.body);
    
    if(password.length < 6){
      return res.send({message : "invalid length"});
    }
    /* condition for email, password are not null */

    if (!username || !password) {
      return res.send({
        data: {},
        status: "fail",
        fail: {
          errorCode: 400,
          message: "username or password missing"
        }
      });
    };

    await User.findOne({ username: req.body.username }, async function (err, userDetails) {
      if (err) {
        logger.error('login: DBError in finding user details.');
        return;
      }
      if (!userDetails) {
        return res.send({ error: err, success: false, message: "No user exist with this username" }).status(401);
      }

      /* condition for compare password with users table data */

      if (!Helper.comparePassword(userDetails.password, password)) {
        return res.send({ data: {}, error: "Invalid Password", success: false }).status(403);
      };

      let date = new Date().toISOString().substring(0, 10);
      // let date = new Date("2020-12-29").toISOString().substring(0,10);
      let slotData = {};
      await CounselorToUser.find({ userId: userDetails._id, date: { $gte: date } })
        .then((doc) => {
          slotData.date = doc[0].date;
          slotData.slots = doc[0].slots;
          console.log(slotData);
        })
        .catch(error => {
          return slotData = {};
        });

      // console.log("slotData: ", slotData, userDetails._id);
      logger.info('login: ' + userDetails.username + ' logged in.');
      userDetails.fcmToken = req.body.fcmToken;
      userDetails.save().then(doc => console.log("doument saved"));

      // Chat related data
      let thread = {};
      await Chat.findOne({ user_id: userDetails._id, agoraToken : {$exists : false}})
        .then(async (data) => {
          await Counselor.findById(data.counsellor_id)
            .then(result => {
              thread.counselorId = data.counsellor_id;
              thread.joinId = data.joinId;
              thread.counsellorname = data.counsellorname;
              thread.counselorImage = result.photo ? result.photo : " "

              const token = Helper.generateToken(userDetails._id);
              
              if (!userDetails.stripeCustomerId || !userDetails.subscriptionId) {
                console.log("thread: ", thread, token, slotData);
                const data = {
                  userDetails,
                  token,
                  membership: {},
                  slotData : slotData,
                  thread
                }
                // console.log("data: ", data);
                res.send({ data, success: true, message: " user login success" });
              }
              else {
                console.log("in else");
                let customerId = userDetails.stripeCustomerId;
                stripe.invoices.retrieveUpcoming({
                  customer: customerId
                })
                  .then(invoice => {
                    console.log("invoices: ", invoice);
                    // let end_date = new Date(invoice.lines.data[0].period.start * 1000).toUTCString();
                    let end_date = new Date(invoice.period_end * 1000).toUTCString();
                    stripe.products.retrieve(
                      invoice.lines.data[0].plan.product
                    )
                      .then(product => {
                        let membership = {
                          amount_paid: invoice.lines.data[0].amount,
                          exp_date: end_date,
                          plan_name: product.name,
                          priceId: invoice.lines.data[0].plan.id
                        }
                        const data = {
                          userDetails,
                          token,
                          membership,
                          slotData,
                          thread
                        }
                        res.send({
                          data,
                          success: true,
                          message: 'User login success'
                        });
                      })
                      .catch(error => {
                        res.send({ error, success: false, message: "stripe error: product fetch error" });
                      })
                  })
                  .catch(error => {
                    const data = {
                      userDetails,
                      token,
                      membership : {},
                      slotData,
                      thread
                    }
                    res.send({
                      data,
                      success: true,
                      message: 'User login success'
                    });
                  })
              }
            })
            .catch(error => {
              console.log(error);
              res.send({ error, success: false, message: "DB error : counselor data fetch" });
            })
        })
        .catch(error => {
          res.send({ error, success: false, message: "Thread data fetch error" });
        })
    })
  }
  catch (error) {
    res.send({ error: error.message }).status(500);
  }
};




module.exports.createUser = async function (req, res) {
  try {
    // check if all field is available
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.send({data : {}, error: "username or email or password is missing", success : false }).status(400);
    }

    if(password.length < 6){
      return res.send({success : false, message : "password length must be greater than or equal to 6"});
    }
    // check if user exist
   await User.findOne({$and : [{email: req.body.email, username : req.body.username}]})
    .then(user =>{
        if (!user) {
          const user = new User({
            username: req.body.username,
            email: req.body.email,
            mobileNo: req.body.mobileNo,
            password: Helper.hashPassword(req.body.password),
            feeling: req.body.feeling,
            challenge: req.body.challenge,
            arealife: req.body.arealife,
            description: req.body.description,
            sucideattempt: req.body.sucideattempt,
            counsellingattempt: req.body.counsellingattempt,
            age: req.body.age,
            country: req.body.country,
            state: req.body.state,
            address : req.body.address,
            relationshipstatus: req.body.relationshipstatus,
            genderidentity: req.body.genderidentity,
            sexualorientation: req.body.sexualorientation,
            religousspitual: req.body.religousspitual,
            painorillness: req.body.painorillness,
            medicinestatus: req.body.medicinestatus,
            ready: req.body.ready,
            deleted: req.body.deleted,
            fcmToken : req.body.fcmToken,
            nickName : req.body.nickName,
            profilePhoto : "download.jpg",
            counselorId : "5fc9cb88db493e26f44e9622",
          });
          user.save((error, userDetails) => {
            if (error) {
              res.send({data : {}, error: error.message, message: "username or email already taken" }).status(500);
            }
            else{
              let newData = {
                joinId : userDetails._id +"-" + "5fc9cb88db493e26f44e9622"
              }
              User.updateOne({_id : userDetails._id}, newData)
              .then(updatedUser =>{
                console.log("join id attached to user");
              })
                let dummyAssignedData = new CounselorToUser({
                  counselorId : "5fc9cb88db493e26f44e9622",
                  userId : userDetails.id
                });
                dummyAssignedData.save()
                .then(doc =>{
                  const chatData = new Chat({
                    user_id : userDetails._id,
                    username : userDetails.username,
                    counsellor_id : "5fc9cb88db493e26f44e9622",
                    counsellorname : "Ares mink",
                    joinId : userDetails._id +"-" + "5fc9cb88db493e26f44e9622",
                    message  : "this is intro message send by dummy counselor"
                  });
                  chatData.save()
                  .then(chat =>{
                      // let thread = {
                      //   image : "1609912613626.jpg",
                      //   chat
                      // }
                      const token =  Helper.generateregisterationToken(userDetails.id);
                      let data = {
                        userDetails,
                        token,
                        thread : chat,
                        counselorImage : "1609912613626.jpg"
                      }
                      const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/registerUser.hbs'), "utf8");
                      let templateData = {
                        username: userDetails.username,
                      }
                      let mailData = {
                        subject: 'Successfully Registeration',
                        to: userDetails.email
                      }
                      if (mailSend.sendMail(mailData, templateData, emailTemplate)){
                        console.log("email sent");
                      }
                      else{
                        console.log("email not sent")
                      }
                      res.send({ data: data, success: true, message: "User Registered Successfully" });
                  })
                  .catch(error =>{
                    res.send({error, success : false, message : "DB error: thread data save"});
                  })
                  console.log(`dummy counselor assigned to user`);
                })
                .catch(error =>{
                  res.send({error, success : false, message : " DB error"});
                  console.log(`user ko dummy counselor assing karne me DB error`);
                })
              
            }
          })
        }
        else {
          return res.send({ data: {},success: false, message: "username or email already taken" }).status(402);
        }
    })
    .catch(error =>{
      res.send({ error: error, message: "Db error" }).status(500);
    })
  }
  catch (error) {
    res.send({ error: error.message, message: "Error while registration" }).status(500);
  }
}





// forgot password functionality

module.exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: email });
    // console.log("user: ", user);
    if (!user) {
      return res.send({ response: {}, success: false, message: "No user exist with this email" });
    }
    else {
      let otp = Math.floor(Math.random() * 100000);

      const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/sendOtp.hbs'), "utf8");

      // data to be send to template
      let templateData = {
        email: user.username,
        otp: otp
      }
      let mailData = {
        subject: 'OTP for reset password',
        to: user.email
      }
      
      // let response = mailSend.sendMail(mailData, templateData, emailTemplate);
      console.log("response: ", mailSend.sendMail(mailData, templateData, emailTemplate));
      if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
        OTP.findOneAndUpdate({ email: email }, { email: email, otp: otp }, { upsert: true, new: true })
          .then(doc => {
            res.send({ response: doc, success: true, message: "OTP sent to your mail" });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error in otp data save" });
          })
      }
      else {
        res.send({ response: {}, success: false, message: "mail send error" });;
      }
    }
  }
  catch (error) {
    res.send({ error: error, message: 'Error at forgot password', success: false });
  }
}


// OTP Verification

module.exports.verifyOTP = async(req, res) => {
  try {
    let user = await User.findOne({email : req.body.email});
    if(!user) return res.send({data : {}, success : false, message : "DB error"});
    OTP.findOne({ email: req.body.email })
      .then(doc => {
        if (doc.otp === req.body.otp) {
          let password = req.body.password;
          let confirmPassword = req.body.confirmPassword;
          if (password === confirmPassword) {
            password = Helper.hashPassword(password);
            User.findOneAndUpdate({ email: req.body.email }, { password: password }, { new: true })
              .then(user => {
                const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/passwordUpdated.hbs'), "utf8");
                let templateData = {
                  username: user.username,
                }
                let mailData = {
                  subject: 'Password Updated',
                  to: user.email
                }
                if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
                  console.log("email sent");
                }
                else {
                  console.log("email not sent")
                }
                res.send({ data: user, success: true, message: "Password update success" });
              })
              .catch(error => {
                res.send({ error, success: false, message: "DB error: password update" });
              })
          }
          else {
            res.send({ data: {}, success: false, message: "mismatch password and confirmPassword" });
          }
        }
        else {
          res.send({ success: false, message: "incorrect otp" });
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error: no user found" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error: forgot password" });
  }
}



// Reset password 
module.exports.resetPassword = (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      res.send({data : {}, error: 'mismatch confirm password with new password', success : false }).status(301);
    }
    else {
      let { userId } = jwt.decode(req.params.token);
      User.findById(userId, (error, user) => {
        if (error) {
          res.send({data : {}, error: error.message, success : false, message: 'DB error in Reset Password' });
        }
        if (!user) {
          res.send({data : {}, error: error, success : false, message: 'No user found with such id'}).status(302);
        }
        else {
          let { password } = user;

          if (!Helper.comparePassword(password, currentPassword)) {
            return res.send({data : {}, error: "Incorrect current password", success : false }).status(303);
          }

          else{
            user.password = Helper.hashPassword(newPassword);
            user.save((error,doc)=>{
              if(error){
                res.send({data : {}, error : error.message, success : false, message : 'Reset Password DB error'});
              }
              if(!doc){
                res.send({data : {}, error : error.message,success : false, message : 'No user password updated'});
              }
              else{
                res.send({data : doc, success : true, message : 'password reset successfully'}).status(200);
                const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/passwordUpdated.hbs'), "utf8");
                let templateData = {
                  username: user.username,
                }
                let mailData = {
                  subject: 'Password Updated',
                  to: user.email
                }
                if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
                  console.log("email sent");
                }
                else {
                  console.log("email not sent")
                }
                
              }
            })
          }
        }
      })
    }
  }
  catch (error) {
    res.send({error : error.message,success : false, message : 'Unknown error in reset password'}).status(500);
  }
}

// get user data and assigned counselor data
module.exports.getUserById = async(req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    await CounselorToUser.findOne({ userId: userId })
      .then(doc => {
        User.findById(userId, async (error, userDetails) => {
          if (error) {
            res.send({ data: {}, error: error.message, success: false, message: 'DB error during fetch user' });
          }
          if (!userDetails) {
            res.send({ data: {}, error: error, success: false, message: 'No user found with this id' });
          }

          else {
            let date = new Date().toISOString().substring(0, 10);
            // let date = new Date("2020-12-29").toISOString().substring(0,10);
            let slotData = {};
            await CounselorToUser.find({ userId: userDetails._id, date: { $gte: date } })
              .then(doc => {
                slotData.date = doc[0].date;
                slotData.slots = doc[0].slots;
                // console.log(slotData);
              })
              .catch(error => {
                return slotData = {};
              });

            let thread = {};
            await Chat.findOne({ user_id: userDetails._id })
              .then(async (data) => {
                await Counselor.findById(data.counsellor_id)
                .then(result =>{
                    thread.counselorId = data.counsellor_id;
                    thread.joinId = data.joinId;
                    thread.counsellorname = data.counsellorname;
                    thread.counselorImage = result.photo ? result.photo : " "
                })
                .catch(error =>{
                  res.send({error, success : false, message : "DB error: thread data fetch error"});
                })
              })
              .catch(error => {
                res.send({ error, success: false, message: "Thread data fetch error" });
              })

            console.log("customerId: ", userDetails.isCanceled, userDetails.stripeCustomerId);
            if(!userDetails.stripeCustomerId || userDetails.isCanceled == true){
              console.log("in if condition: ", userDetails.isCanceled);
              const data = {
                userDetails,
                thread,
                slotData
              }
              res.send({
                data,
                success: true,
                message: 'User fetched for my profile section'
              });
            }
            else{
              let customerId = userDetails.stripeCustomerId;
              stripe.invoices.retrieveUpcoming({
                customer: customerId
              })
                .then(invoice => {
                  console.log("inovce: ",invoice);
                  let end_date = new Date(invoice.period_end * 1000).toUTCString();
                  stripe.products.retrieve(
                    invoice.lines.data[0].plan.product
                  )
                  .then(product =>{
                    let invoiceData = {
                      amount_paid: invoice.lines.data[0].amount,
                      exp_date: end_date,
                      plan_name: product.name,
                      priceId: invoice.lines.data[0].plan.id
                    }
                    
                    const data = {
                      userDetails,
                      invoiceData,
                      thread,
                      slotData
                    }
                    res.send({
                      data,
                      success: true,
                      message: 'User fetched for my profile section'
                    });
                  })
                  .catch(error =>{
                    res.send({error, success : false, message : "stripe error: product fetch error"});
                  })
                })
                .catch(error => {
                  res.send({ error, success: false, message: "Stripe invoice fetch error" });
                })
            }
          }
        })
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error" });
      });
  }
  catch (error) {
    res.send({ error: error.message, success: false, message: 'DB error while making request for fetch user' });
  }
}



// file upload module
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if(file.mimetype == 'video/mp4'|| file.mimetype == 'video/x-matroska'){
      cb(null,'./uploads/user/videos');
    }
    if(file.mimetype == 'audio/mpeg' || file.mimetype == 'audio/mp3' || file.mimetype == 'audio/x-m4a'){
      cb(null,'./uploads/user/audios');
    }
    if(file.mimetype == 'application/pdf' || file.mimetype == 'image/jpeg' || 
      file.mimetype == 'image/png'|| file.mimetype == 'image/jpg' ||  file.mimetype == 'application/msword' || 
      file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
      cb(null,'./uploads/user/attachment');
    }
  },

  filename: (req, file, cb) => {
  	// console.log("file: ", req.file , " ", file);
    if(file.mimetype === 'audio/mp3' || file.mimetype === 'audio/mpeg' || 
      file.mimetype == 'video/mp4'|| file.mimetype == 'video/x-matroska' || file.mimetype == 'audio/x-m4a'){
      let originalname = file.originalname;
      let extension = originalname.split(".");
      console.log("extension: ", extension);
      if(extension[extension.length - 1] == 'mp3' ||extension[extension.length - 1] == 'm4a' || 
          extension[extension.length - 1] == 'mpeg'){
        filename = Date.now() + "." + extension[extension.length - 1];
        console.log("file name: in if ", filename);
        cb(null, filename);
      }
      else if(extension[extension.length - 1] == 'mp4'){
        filename = Date.now() + "." + extension[extension.length - 1];
        cb(null, filename);
      }
      else{
        filename = (file.mimetype === 'audio/mp3' || file.mimetype === 'audio/mpeg') ? file.originalname + '.mp3' : file.originalname +'.mp4'
        console.log("filename: ", filename);
        cb(null, filename);
      }
    }
    else{
      let originalname = file.originalname;
      let extension = originalname.split(".");
      filename = Math.floor(Math.random()*1000000000) + "." + extension[extension.length - 1];
      console.log("filename: in else : ", filename);
      cb(null, filename);
    }
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
    cb(null, true);
  }
  else {
    return cb(new Error('only jpeg/png/jpg files are allowed'));
  }
}

const upload = multer({ storage : storage, fileFilter :fileFilter }).single('image');


// user profile picture upload section
module.exports.profilePictureUpload = (req, res) => {
  let storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if(file.mimetype == 'image/jpeg' || file.mimetype == 'image/png'|| file.mimetype == 'image/jpg'){
        cb(null,'./uploads/');
      }
    },
    filename : (req, file, cb) =>{
      let originalname = file.originalname;
      let extension = originalname.split(".");
      filename = Math.floor(Math.random()*1000000000) + "." + extension[extension.length - 1];
      cb(null, filename);
    }
  })
  let upload = multer({ storage : storage, fileFilter :fileFilter }).single('image');
  upload(req, res,(error) =>{
    console.log("req.file: ", req.file);
    if(error){
      res.send({data : {}, success : false, error, message : "file upload error" });
    }
    else{
      try {
        
        let {userId} = jwt.decode(req.params.token);
        // let userId = req.params.token;
        console.log("req.file.filename: ", req.file.filename, userId);
        let imageData = {
          profilePhoto : req.file.filename
        }
        User.updateOne({_id : userId}, imageData, {new : true})
          .then((result, error) =>{
            if(error){
              res.send({data : {}, error, success : false, message : "error in file upload"});
            }
            else{
              console.log("in else: ", req.file.filename, req.params.token);
              res.send({data : req.file.filename, message: "image uploaded", success: true }).status(201);
            }
          })
          .catch(error => res.send({error, message: "image upload error", success: false }).status(201));
      }

      catch (error) {
        res.send({ data : {}, success : false, error, message : " invalid request" }).status(203);
      }
    }
  });
}

module.exports.audioVideoUpload = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    let userDetails = await User.findOne({ _id: userId });
    // console.log("userDetails: ", userDetails);
    if (userDetails && userDetails.subscriptionId == null) {
      return res.send({ success: false, message: "please purchase any plan" });
    }
    else {
      let fileSize = 20 * 1024 * 1024;
      const fileFilter = (req, file, cb) => {
        // console.log("file.mimetype: ", file);
        if (!file.mimetype || file.mimetype == undefined) {
          res.send({ success: false, message: "error: undefined file" });
        }
        else {
          // console.log("in else");
          if (file.mimetype == 'video/mp4' || file.mimetype == 'audio/mpeg' ||
            file.mimetype === 'video/x-matroska' || file.mimetype == 'audio/mp3' || file.mimetype == 'audio/x-m4a') {
            // console.log("cb null true:", cb(null,true));
            cb(null, true);
          }
          else {
            // cb(null, false);
            return cb(new Error('only mp4 or mp3/mpeg files are allowed'));
          }
          // console.log("cb(null, true);", cb(null, true));
          // cb(null, true);
        }
      }
      const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: { fileSize: fileSize }
      }).single('file');
      upload(req, res, (error) => {
        if (error) {
          res.send({ error, success: false, message: "only mp4 or mp3/mpeg files are allowed" });
        }
        else {
          console.log("req.file: ", req.file);
          // getAudioDurationInSeconds(req.file.originalname)
          // .then(duration =>{
          //   console.log("duratiob: ", duration);
          // })
          Chat.findOne({ joinId: req.body.joinId, agoraToken : {$exists : false}})
            .then(thread => {
              console.log("thread: ", thread);
              let chatData = new Chat({
                user_id: req.body.user_id,
                username: thread.username,
                user_image: thread.user_image ? thread.user_image : "",
                counsellor_id: thread.counsellor_id,
                counsellorname: thread.counsellorname,
                joinId: req.body.joinId,
                message: req.file.mimetype === 'audio/mp3' || req.file.mimetype === 'audio/mpeg' ||
                  req.file.mimetype === 'audio/x-m4a' ? "audios/" + req.file.filename : "videos/" + req.file.filename,
                fileupload: req.file.mimetype,
                message_type: req.file.mimetype === 'audio/mp3' || req.file.mimetype === 'audio/mpeg' ? "audio" : "video",
                time: Date.now(),
                id: thread.id,
                role: req.body.role,
                messageAudio: req.body.messageAudio,
                visible : false
              });
              chatData.save()
                .then(doc => {
                  console.log("doc: ", doc);
                  res.send({
                    data: doc.fileupload,
                    success: true,
                    message: "you just uploaded a file"
                  });
                })
                .catch(error => {
                  res.send({ error, success: false, message: "DB error: file data save error" });
                })
            })
        }
      })
    }
  }
  catch (error) {
    res.send({ error, message: "you just got an error in file upload" });
  }
}

// for attachment

module.exports.attachment = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    let userDetails = await User.findOne({ _id: userId });
    // console.log("userDetails: ", userDetails);
    if (!userDetails && userDetails.status == 'inactive') {
      return res.send({ success: false, message: "please purchase any plan" });
    }
    else {
      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          if (file.mimetype == 'application/pdf' || file.mimetype == 'image/jpeg' ||
            file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'application/msword' ||
            file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, './uploads/user/attachment');
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
        if (file.mimetype == 'application/pdf' || file.mimetype == 'image/jpeg' ||
          file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'application/msword' ||
          file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          cb(null, true);
        }
        else {
          // cb(null, false)
          cb(new Error('only pdf/doc/images are allowed'));
        }
      }
      const upload = multer({ storage: storage, fileFilter: fileFilter }).single('file');
      upload(req, res, async (error) => {
        if (error) {
          res.send({ error, success: false, message: "only pdf or txt files are allowed" });
        }
        else {

          // let userId = req.params.token;
          Chat.findOne({ joinId: req.body.joinId })
            .then(thread => {
              if (!thread) {
                res.send({ data: {}, success: false, message: "No thread found" });
              }
              else {
                console.log("thread: ", thread);
                let chatData = new Chat({
                  user_id: thread.userId,
                  username: thread.username,
                  user_image: thread.user_image ? thread.user_image : "",
                  counsellor_id: thread.counsellor_id,
                  counsellorname: thread.counsellorname,
                  joinId: req.body.joinId,
                  message: "attachment/" + req.file.filename,
                  fileupload: "attachment",
                  type: req.file.mimetype === 'application/pdf' ? req.file.mimetype : 'image',
                  time: Date.now(),
                  id: thread.id,
                  role: req.body.role,
                  messageAudio: req.body.messageAudio,
                  visible : false
                });
                chatData.save()
                  .then(doc => {
                    console.log("doc: ", doc);
                    res.send({
                      data: doc,
                      success: true,
                      message: "you just uploaded a file"
                    });
                  })
                  .catch(error => {
                    res.send({ error, success: false, message: "DB error: attachment data save error" });
                  })
              }
            })
        }
      })
    }
  }
  catch (error) {
    res.send({ error, success: false, message: " you just got error in attachment" });
  }
}



// nick name or email update

module.exports.updateNickName = async(req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    const user = await User.findOne({ _id: userId });
    // let userId = req.params.token;
    if (!req.body.nickName) {
      res.send({ data: {}, success: false, message: "nothing to update" });
    }
    else {
      let userData = {
        username: user.username,
        nickName: req.body.nickName
      }
      User.updateOne({ _id: userId }, userData)
        .then(response => {
          if (response.nModified == 1) {
            const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/profileUpdated.hbs'), "utf8");

            // data to be send to template
            let templateData = {
              email: user.username,
              otp: otp
            }
            let mailData = {
              subject: 'Profile Update',
              to: user.email
            }

            // let response = mailSend.sendMail(mailData, templateData, emailTemplate);
            console.log("response: ", mailSend.sendMail(mailData, templateData, emailTemplate));
            if (mailSend.sendMail(mailData, templateData, emailTemplate)){
              console.log("email sent");
            }
            else{
              console.log("email not sent")
            }
            res.send({ response, success: true, message: "profile updated" });
          }
          else {
            res.send({ response, success: false, message: "not updated" });
          }
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error" });
        })
    }
  }
  catch (error) {
    res.send({ data: {}, success: false, error, message: " invalid request" }).status(203);
  }
}


module.exports.logout = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let newData = {
      fcmToken : ""
    }
    User.updateOne({_id : userId}, newData)
    .then(doc =>{
      res.send({doc, success : true, message : "token reset"});
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "Unknown error"});
  }
}




// Switch Counselor
// filter counselor list according to gender specified by user at time to registration

module.exports.switchCounselor = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    // let preferedfGender = req.body.preferedfGender ? req.body.preferedfGender : 'Male';
    let thread = await Chat.findOne({ user_id: userId });
    if(!thread || thread == null){
      return res.send({success : false, message : "no thread found"});
    }
    else{
      Counselor.find({_id: { $nin : [ thread.counsellor_id, "5fc9cb88db493e26f44e9622"] }})
      .then(docs => {
        // console.log("docs: ", docs);
        let n = Math.floor(Math.random() * docs.length);
        Chat.deleteMany({user_id : userId})
        .then(doc =>{
          console.log("old chat deleted : ", doc);
        })
        CounselorToUser.deleteMany({userId : userId})
        .then(doc=>{
          console.log("old sessions deleted : ", doc);
        })
        User.findById(userId)
          .then(user => {
            console.log(userId, docs[n]._id, docs[n].userName, user.username)
            let threadData = new Chat({
              user_id: userId,
              counsellor_id: docs[n]._id,
              counsellorname: docs[n].userName,
              username: user.username,
              joinId: userId + "-" + docs[n]._id,
              message: docs[n].introMessage ? docs[n].introMessage : "",
              type: "text",
              visible: false,
              role: 1
            })
            threadData.save()
            .then(thread1 =>{
              let userData = {
                joinId : userId + "-" + docs[n]._id,
                counselorId : docs[n]._id 
              }
              User.updateOne({_id : userId}, userData)
              .then(newUserData =>{
                const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/counselorSwitch.hbs'), "utf8");
                let templateData = {
                  username: user.username,
                  counselorName : docs[n].userName,
                }
                let mailData = {
                  subject: 'Counsellor Switched',
                  to: user.email
                }
                if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
                  console.log("email sent");
                }
                else {
                  console.log("email not sent")
                }
                console.log("user model updated with join id and counselor id", newUserData);
              })
              res.send({thread1, success : true, message : "counselor switched success"});
            })
          })
          .catch(error => {
            res.send({error, success : false, message : "thread data save error"});
          })
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error: counselor list fetch error" });
      })
    }
  }
  catch (error) {
    res.send({ error, success: false, message: "Unknown error" });
  }
}


// get counselor profile by a user 

module.exports.counselorProfile = (req, res) =>{
  try {
    let userId = req.body.counselorId;
    Counselor.findById(userId, (error, doc) =>{
      if(error){
        res.send({data : {}, success : false, message : error.message});
      }
      if(!doc){
        res.send({data : {}, success : false, message : "No counselor exist with this id"});
      }
      else{
        res.send({data : doc, success : true, message : "Counselor fetched successfully"});
      }
    })
  } 
  catch (error) {
    res.send({data : {}, success : false,error, message : "Unknown error"});
  }
}


// get all questions
module.exports.getQuestions = (req, res) => {
  try {
    console.log("in here");
    Question.find({}, (error, doc) => {
      if (error || !doc) {
        res.send({ error: error.message, success: false , message: 'DB error during fetch questions'});
      }
      if (doc.length > 0) {
        res.send({ data: doc[0], success: true , message: 'Questions fetched'});

      }

      else {
        res.send({ error: error, success: false , message: 'No Questions details found'});
      }
    })
  }
  catch (error) {
    res.send({ error: error.message, success: false , message: 'DB error during fetch Questions'});
  }
}



// All Stripe Related API's



// View all subscription plan

module.exports.viewAllPlan = async (req, res)=>{
  const products = await stripe.plans.list({
      limit: 2,
    })
    .then(products =>{
      res.send({data : products, success : true})  
    })
    .catch(error =>{
        res.send({error : error, message : "plan fetch error"});
    });
}


module.exports.viewSinglePlan = async (req, res) => {
  try {
    let response = {};
    await stripe.plans.retrieve(req.body.priceId)
      .then(plan => {
        console.log("plan is: ", plan);
        response.amount = plan.amount;
        stripe.products.retrieve(plan.product)
          .then(product => {
            console.log("products is: ", product);
            response.name = product.name;
            response.priceId = req.body.priceId;
            res.send({ data: response, success: true, message: "Single plan details fetched" });
          })
          .catch(error => {
            res.send({ error, success: false, messages: "product fetch error" });
          });
      })
      .catch(error => {
        res.send({ error, success: false, message: "error in plan fetch" });
      });
  }
  catch (error) {
    res.send({ error, success: false, message: "something goes wrong in single plan fetch" });
  }
}



module.exports.getCurrentMembership = async (req, res) => {
  try {
    // let customerId = req.body.customerId;
    let {userId} = jwt.decode(req.params.token);
    // let userId = req.params.token;
    // console.log(customerId);
    let user = await User.findById(userId);
    console.log("user : ", user.subscriptionId);
    if(!user.subscriptionId){
      res.send({creditCount : user.creditCount ,success : true, message : "you don't have any plan"});
    }
    else{
      stripe.subscriptions.retrieve(
        user.subscriptionId
      )
      .then(async subscription =>{
        // console.log("subscription: ", subscription);
        console.log(subscription.latest_invoice);
        stripe.invoices.retrieve(
          subscription.latest_invoice
        )
        .then(async invoice =>{
          // console.log("invoice: ", invoice);
          // let end_date = new Date(invoice.lines.data[0].period.end * 1000).toUTCString();
          let end_date = new Date(subscription.current_period_end* 1000).toUTCString();
          console.log("end dtae: ", end_date);
          let product = await stripe.products.retrieve(subscription.items.data[0].plan.product);
          // console.log("product: ", product);
          // console.log("description: ",invoice.lines.data[1].description)
          let data = {
            exp_date : end_date,
            amount_paid : subscription.plan.amount/100,
            plan_name: product.name,
            interval : subscription.items.data[0].price.recurring.interval,
            priceId : subscription.items.data[0].price.id,
            trial : subscription.plan.trial_period_days ? "Yes" : "No" ,
            creditCount : user.creditCount
          //   description : invoice.lines.data[1].description ? invoice.lines.data[1].description : " " 
          }
          res.send({data,invoice, subscription});
        })
        .catch(error =>{
          res.send({error, success : false, message : "might be stripe error"});
        })
      })
      .catch(error =>{
        res.send({error, success : false, message : "stripe error"});
      })
    }
    // res.send({user});
  }
  catch (error) {
    res.send({ error, success: false, message: "something went wrong while invoice collection" });
  }
}


// Past invoice 


module.exports.getPastInvoices = async (req, res) => {
  try {
    let customerId = req.body.customerId;
    // console.log(customerId);
   let pastInvoices =  await stripe.invoices.list({
      customer: customerId,
      limit : 100
    })
    console.log(" past invoices: ", pastInvoices);
    let invoices = [];
    for(let i=0; i< pastInvoices.data.length; i++){
      // console.log("past invoice ", pastInvoices.data);
      await stripe.invoices.retrieve(
        pastInvoices.data[i].id
      )
      .then(item =>{
        let end_date = new Date(item.lines.data[0].period.end * 1000).toUTCString();
        
        stripe.products.retrieve(item.lines.data[0].price.product)
        .then(product =>{
          let invoiceData = {
            amount_paid: item.amount_paid,
            exp_date: end_date,
            plan_name: product.name
          }
          invoices[i] = invoiceData;
          // console.log("invoice data: ", invoices);
        })
        .catch(error =>{
          res.send({error, success : false, message : "product fetch error"});
        })
      })
      .catch(error =>{
        res.send({error, success : false, message : "inovice fetch error"});
      })
      // console.log("inovices: ", invoices);
    }
    res.send({invoices, success : true, message : "data fetch success"});
  }
  catch (error) {
    res.send({ error, success: false, message: "something went wrong in get past invoices" });
  }
}






// Update subscription plan

module.exports.updatePlan = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    // let userId = req.params.token;
    console.log("userid: ", userId);
    User.findById(userId)
    .then(async user =>{
      if(!user) return res.send({success : false, message : "no user found: DB error"});
      console.log("doc: ", user.subscriptionId);
      if (user.isCanceled == false ) {
        stripe.subscriptions.retrieve(
          user.subscriptionId
        )
        .then(subscription =>{
          stripe.subscriptions.update(
            user.subscriptionId,
            {
              cancel_at_period_end: false,
              items: [{
                price: req.body.priceId,
                id : subscription.items.data[0].id
              }],
              trial_end: 'now'
            }
          )
          .then(subscription => {
            User.findOneAndUpdate({ _id: userId },
              { $set: { subscriptionId: subscription.id , 
                planExpireDate : subscription.current_period_end,
                planStartDate : subscription.current_period_start,
                priceId : req.body.priceId,
                isCanceled : false,
                status : 'active'} })
              .then(doc => {
                // console.log(`doc: ${doc}`);
                const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/counselorSwitch.hbs'), "utf8");
                let templateData = {
                  username: user.username,
                }
                let mailData = {
                  subject: 'Counsellor Switched',
                  to: user.email
                }
                if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
                  console.log("email sent");
                }
                else {
                  console.log("email not sent")
                }
                res.send({ data: subscription, success: true, message: "subscription update success" });
              })
              .catch(error => {
                res.send({ error: error, success: false, message: "DB update error"});
              });
          })
        })
        .catch(error =>{
          res.send({
            error : error, 
            success : false, 
            message : "subscription update error: if subscription exists"
          });
        })
      }
      else {
        // console.log('in else:');
        stripe.subscriptions.create({
          customer: user.stripeCustomerId,
          items: [
            { price : req.body.priceId },
          ],
          trial_end : 'now'
        })
        .then(subscription => {
          // console.log("subscription: ",subscription);
          User.findOneAndUpdate({ _id: userId },
            { $set: { subscriptionId: subscription.id , 
              planExpireDate : subscription.current_period_end,
              planStartDate : subscription.current_period_start,
              priceId : req.body.priceId,
              status : 'active'} })
            .then(doc => {
              const emailTemplate = fs.readFileSync(path.join(__dirname, '../views/updateSubscription.hbs'), "utf8");
                let templateData = {
                  username: user.username,
                  start_date : new Date(subscription.current_period_start*1000).toUTCString(),
                  end_date : new Date(subscription.current_period_end*1000).toUTCString(),
                  interval : subscription.items.data[0].plan.interval,
                  amount : subscription.items.data[0].plan.amount/100,
                }
                let mailData = {
                  subject: 'Subscription Updated',
                  to: user.email
                }
                if (mailSend.sendMail(mailData, templateData, emailTemplate)) {
                  console.log("email sent");
                }
                else {
                  console.log("email not sent")
                }
              res.send({ data: subscription, success: true, message: "subscription update success" });
            })
            .catch(error => {
              res.send({ error: error, success: false, message: "DB subscription id update error"});
            });
        })
        .catch(error =>{
          res.send({
            error : error, 
            success : false, 
            message : "subscription update error: after cancelation"
          });
        })
      }
    })
    .catch(error =>{
      res.send({error, success : false, message : 'DB error in user find'});
    }) 
  }
   catch (error) {
    res.send({error, success : false, message : "something went wrong with subscription update"});
  }
}




module.exports.cancelSubscription = (req, res) => {
  try {
    let {userId} = jwt.decode(req.params.token);
    let todayDate = new Date(Date.now()).toDateString();
    let planEndDate;
    User.findOne({ _id : userId })
      .then(result => {
        console.log("result: ", result);
        if(result.subscriptionId == null || result.isCanceled == true){
          return res.send({data : {}, 
            success : false, 
            message : "you dont have any current plan to cancel or you have already canceled your plan"});
        }
        else{
          planEndDate = new Date(result.planExpireDate * 1000).toDateString();
          // stripe.subscriptions.retrieve(
          //   result.subscriptionId
          // )
          // .then(subscription =>{
          //   console.log("subscription:  ", subscription);
            
            
          //   console.log("date 1 : ", typeof planEndDate);
          //   console.log("date2: ", typeof todayDate);
          // });
          stripe.subscriptions.del(result.subscriptionId)
            .then(response => {
              result.status = result.status == 'trial' ?  'inactive' :
                    (planEndDate == todayDate ? 'inactive' : 'active');
              result.isCanceled = true;
              result.save()
                .then(doc => {
                  res.send({ response, success: true, message: "subscription canceled" });
                  console.log("response: ", response);
                })
                .catch(error => {
                  res.send({ error, success: false, message: "DB error in user status update" });
                });
  
            })
            .catch(error => {
              // console.log(error, "error");
              res.send({
                error: error,
                success: false,
                message: error.raw.message
              });
            });
        }
      })
      .catch(error => {
        res.send({ error: error, success: false, message: "might be DB error or stripe error" });
      })
  }
  catch (error) {
    res.send({ error: error, success: false, message: "Something goes wrong in subscription cancelation" });
  }
}




module.exports.updateCard = async (req, res) => {
  let cardDetails = {
    card: {
      number: req.body.cardNumber,
      exp_month: req.body.expMonth,
      exp_year: req.body.expYear,
      cvc: req.body.cvc
    }
  }
  await stripe.tokens.create(cardDetails)
    .then(token => {
      console.log("token", token.id);
      // console.log("stripe customer id", req.params.stripeCustomerId);
      let stripeToken = token.id;
      stripe.customers.createSource(req.body.stripeCustomerId, { source: stripeToken })
        .then(card => {
          console.log("card", card.id);
          
          stripe.customers.updateSource(
            req.body.stripeCustomerId,
            card.id
          )
          let cardData = {
            number: "************"+req.body.cardNumber.substring(12,16),
            expMonth: req.body.expMonth,
            expYear: req.body.expYear,
            cardId : card.id
          }
          User.updateOne({ stripeCustomerId: req.body.stripeCustomerId },
            { $set: { cardDetails: cardData }},{upsert : true, new : true})
            .then(result => {
              console.log("result", result);
              res.send({ data: result, success: true, message: "card details updated" });
            })
            .catch(error => {
              console.log("error", error);
              res.send({error, success : false, message : "DB error in Card update"});
            });
          
        })
        .catch(error => {
          res.send({ 
            error: error, 
            success: false, 
            message: "card update error: there might no user exist with this stripe customer id " 
          });
        });
    })
    .catch(error => {
      res.send({ error: error, success: false, message: error.raw.message });
    })
}


// user will book slots 

module.exports.bookSlots = async (req, res) => {
  try {
    console.log(req.body);
    let { userId } = jwt.decode(req.params.token);
    // let { userId } = jwt.decode(req.body.userId);
    console.log(userId);
    User.findById(userId)
      .then(async user => {
        console.log("user: ", user);
        if (!user) {
          return res.send({ success: false, message: "DB error: no user details found" });
        }
        // console.log("user details: ", user);
        let { counselorId, time, date } = req.body;
        if (!time || !date || !counselorId) {
          return res.send({ success: false, message: "field missing: time/date/counselorId" });
        }
        // let userId = req.params.token;
        console.log("time soit: ",  new Date(parseInt(time.split("-")[0])*1000).toUTCString());
        console.log(req.body.date);
        let date1 = new Date(req.body.date).toUTCString().substring(0, 16);
        console.log("date is: ", date1);
        if (user.creditCount > 0) {
          // do code here if user has left an session credit score
          // don't charge user for session booking
          CounselorToUser.findOne({ counselorId: counselorId, userId: userId, date: date })
            .then(async doc => {
              if (doc != null) {
                let index = doc.slots.findIndex(slot => slot.time == time);
                console.log("index: ", index);
                if(index == -1){
                  let newSlot = {
                    time: time,
                    status: 3
                  }
                  doc.slots.push(newSlot);
                  CounselorToUser.updateOne({ _id: doc._id }, doc)
                    .then(slot => {
                      console.log("slot.userId: ", userId);
                      User.updateOne({ _id: userId }, { $inc: { creditCount: -1 } })
                        .then(credit => {
                          console.log("credit count update: ", credit);
                        });
                      UpcomingSlots.updateOne({ counselorId: counselorId },
                        { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                        { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                        .then(result => {
                          console.log(result);
                        });
                      res.send({ data: slot, success: false, message: "session book success" });
                    })
                    .catch(error => {
                      res.send({ error, success: false, message: "DB error in session data save" });
                    })
                }
                else{
                  for(let i =0; i < doc.slots.length; i++){
                    if(doc.slots[i].time == time){
                      doc.slots[i].status = 3;
                    }
                  }
                  console.log("doc.slots: ", doc.slots);
                  CounselorToUser.updateOne({ _id: doc._id }, doc)
                    .then(slot => {
                      console.log("slot.userId: ", userId);
                      User.updateOne({ _id: userId }, { $inc: { creditCount: -1 } })
                        .then(credit => {
                          console.log("credit count update: ", credit);
                        });
                      UpcomingSlots.updateOne({ counselorId: counselorId },
                        { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                        { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                        .then(result => {
                          console.log(result);
                        });
                      res.send({ data: slot, success: false, message: "session book success" });
                    })
                    .catch(error => {
                      res.send({ error, success: false, message: "DB error in session data save" });
                    })
                }
                
              }
              else {
                const slotData = new CounselorToUser({
                  counselorId: req.body.counselorId,
                  userId: userId,
                  date: date,
                  slots: [{
                    time: time,
                    status: 3
                  }]
                });
                slotData.save()
                  .then(slot => {
                    User.updateOne({ _id: userId }, { $inc: { creditCount: -1 } })
                      .then(credit => {
                        console.log("credit count update: ", credit);
                      });
                    UpcomingSlots.updateOne({ counselorId: counselorId },
                      { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                      { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                      .then(result => {
                        console.log(result);
                      });
                    res.send({ data: slot, success: false, message: "session book success" });
                  })
                  .catch(error => {
                    res.send({ error, success: false, message: "DB error in session data save" });
                  })
              }
            })
        }
        else {
          // if user does not left with any session credit score 
          // charge user for session booking in this case
          if (!user.stripeCustomerId) {
            if (!req.body.cardNumber || !req.body.expMonth || !req.body.expYear || !req.body.cvc) {
              return res.send({ success: false, message: "card details missing: cardNumber/expMonth/expYear/cvc" });
            }
            const customer = await stripe.customers.create({
              email: req.body.email,
              // name: req.body.username,
              description: 'one time payment',
              // address: req.body.address
            });

            const token = await stripe.tokens.create({
              card: {
                number: req.body.cardNumber,
                exp_month: req.body.expMonth,
                exp_year: req.body.expYear,
                cvc: req.body.cvc,
              },
            });

            const source = await stripe.customers.createSource(customer.id, {
              source: token.id
            })

            await stripe.charges.create({
              amount: 2000,
              currency: 'usd',
              source: source.id,
              customer: customer.id,
              description: 'session booking charge',
            })
              .then(async (charge) => {
                console.log("charge in case user had not card add: ");
                CounselorToUser.findOne({ counselorId: counselorId, userId: userId, date: date })
                  .then(async doc => {
                    if (doc != null) {
                      let index = doc.slots.findIndex(slot => slot.time == time);
                      console.log("index: ", index);
                      if(index == -1){
                        let newSlot = {
                          time: time,
                          status: 3
                        }
                        doc.slots.push(newSlot);
                        CounselorToUser.updateOne({ _id: doc._id }, doc)
                          .then(slot => {
                            UpcomingSlots.updateOne({ counselorId: counselorId },
                              { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                              { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                              .then(result => {
                                console.log(result);
                              });
                            res.send({ data: slot, success: false, message: "session book success" });
                          })
                          .catch(error => {
                            res.send({ error, success: false, message: "DB error in session data save" });
                          })
                      }
                      else{
                        for(let i=0; i< doc.slots.length; i++){
                          if(doc.slots[i].time == time){
                            doc.slots[i].status = 3;
                          }
                        }
                        CounselorToUser.updateOne({ _id: doc._id }, doc)
                          .then(slot => {
                            UpcomingSlots.updateOne({ counselorId: counselorId },
                              { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                              { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                              .then(result => {
                                console.log(result);
                              });
                            res.send({ data: slot, success: false, message: "session book success" });
                          })
                          .catch(error => {
                            res.send({ error, success: false, message: "DB error in session data save" });
                          })
                      }
                    }
                    else {
                      const slotData = new CounselorToUser({
                        counselorId: req.body.counselorId,
                        userId: userId,
                        date: date,
                        slots: [{
                          time: time,
                          status: 3
                        }]
                      });
                      slotData.save()
                        .then(slot => {
                          UpcomingSlots.updateOne({ counselorId: counselorId },
                            { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                            { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                            .then(result => {
                              console.log(result);
                            });
                          res.send({ data: slot, success: false, message: "session book success" });
                        })
                        .catch(error => {
                          res.send({ error, success: false, message: "DB error in session data save" });
                        })
                    }
                  })
              })
              .catch(error => {
                res.send({ error, success: false, message: "payment error: something wrong with card" });
              })
          }
          else {
            stripe.charges.create({
              amount: 2000,
              currency: 'usd',
              source: user.cardDetails.cardId,
              customer: user.stripeCustomerId,
              description: 'charge created for session booking',
            })
              .then(charge => {
                console.log("in case if user had card add: ");
                CounselorToUser.findOne({ counselorId: counselorId, userId: userId, date: date })
                  .then(async doc => {
                    if (doc != null) {
                      let index = doc.slots.findIndex(slot => slot.time == time);
                      console.log("index: ", index);
                      if(index == -1){
                        let newSlot = {
                          time: time,
                          status: 3
                        }
                        doc.slots.push(newSlot);
                        CounselorToUser.updateOne({ _id: doc._id }, doc)
                          .then(async slot => {
                            UpcomingSlots.updateOne({ counselorId: counselorId },
                              { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                              { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                              .then(result => {
                                console.log(result);
                              });
                            res.send({ data: slot, success: false, message: "session book success" });
                          })
                          .catch(error => {
                            res.send({ error, success: false, message: "DB error in session data save" });
                          })
                      }
                      else{
                        console.log("doc.slots before for loop: ", doc.slots);
                        for(let i=0; i < doc.slots.length; i++){
                          if(doc.slots[i].time == time){
                            doc.slots[i].status = 3;
                          }
                        }
                        console.log("doc.slots: ", doc.slots);
                        CounselorToUser.updateOne({ _id: doc._id }, doc)
                          .then(async slot => {
                            UpcomingSlots.updateOne({ counselorId: counselorId },
                              { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                              { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                              .then(result => {
                                console.log(result);
                              });
                            res.send({ data: slot, success: false, message: "session book success" });
                          })
                          .catch(error => {
                            res.send({ error, success: false, message: "DB error in session data save" });
                          })
                      }
                      
                    }
                    else {
                      const slotData = new CounselorToUser({
                        counselorId: counselorId,
                        userId: userId,
                        date: date,
                        slots: [{
                          time: time,
                          status: 3
                        }]
                      });
                      slotData.save()
                        .then(slot => {
                          UpcomingSlots.updateOne({ counselorId: counselorId },
                            { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                            { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                            .then(result => { console.log(result); });
                          res.send({ data: slot, success: false, message: "session book success" });
                        })
                        .catch(error => {
                          res.send({ error, success: false, message: "DB error in session data save" });
                        })
                    }
                  })
              })
              .catch(error => {
                res.send({ error, successc: false, message: "card charge error" });
              })
          }
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error : no user found" });
      });
  }
  catch (error) {
    res.send({ error, success: false, message: " Something went wrong in book slot data save" });
  }
}



// get upcoming sessions of a user

module.exports.getUpcomingSessions = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    let date = new Date().toISOString().substring(0, 10);
    CounselorToUser.aggregate([
      { "$match": { "userId": userId } },
      { "$match": { "date": { $gte: date } } },
      { "$unwind": "$slots" },
      { "$match": {"slots.status" : {"$in" : [0,3]}} }
    ])
      .then(upcomingSessions => {
        if (!upcomingSessions || upcomingSessions.length == 0) {
          res.send({ upcomingSessions: {}, success: false, message: "no booking found" });
        }
        else {
          let time = Math.floor(Date.now()/1000);
          let sessionCount = upcomingSessions.filter(item =>{
            return item.slots.status ==3 && parseInt(item.slots.time.split("-")[0]) > time;
          })
          console.log("session count: ", sessionCount.length);
          upcomingSessions = upcomingSessions.sort((a,b) =>{
            // console.log("a.parseint: ", new Date(a.date));
            return new Date(a.date) - new Date(b.date);
          });
          upcomingSessions = upcomingSessions.map(item =>{
            return {...item, startTime : item.slots.time.split("-")[0]}
          })
          res.send({ upcomingSessions,
            count :sessionCount.length,
            success:true,
            message: "you got your upcoming sessions for this user" });
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error in upcoming session find" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error" });
  }
}




module.exports.getLatestSession = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    console.log("userid: ", userId);
    let date = new Date().toISOString().substring(0, 10);
    CounselorToUser.aggregate([
      { "$match": { "userId": userId } },
      { "$match": { "date": { $gte: date } } },
      { "$unwind": "$slots" },
      { "$match": {"slots.status" : 3} }
    ])
      .then(upcomingSessions => {
        if (!upcomingSessions || upcomingSessions.length == 0) {
          res.send({ upcomingSessions: [], success: false, message: "no booking found" });
        }
        else {
          console.log("date.now: ", Math.floor(Date.now()/1000));
          // console.log("upcoing sessions: ", upcomingSessions);
          let time = Math.floor(Date.now()/1000);
          // let time = 1620190523;
          console.log("time: ", time);
          upcomingSessions = upcomingSessions.filter(item =>{
            console.log(item.slots.time.split("-")[1])
            return parseInt(item.slots.time.split("-")[1]) > time;
          })
          console.log("after filter: ", upcomingSessions);
          upcomingSessions = upcomingSessions.sort((a,b) =>{
            // console.log("type of: ", typeof parseInt(a.slots.time.split("-")[0]));
            return a.slots.time.split("-")[0] - b.slots.time.split("-")[0]
          })
          upcomingSessions = upcomingSessions.map(item =>{
            return {...item, startTime : item.slots.time.split("-")[0], endTime : item.slots.time.split("-")[1]}
          })
          res.send({ upcomingSessions,
            success:true,
            message: "you got your upcoming sessions for this user" });
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error in upcoming session find" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error" });
  }
}






// user will get all upcoming active slots of a counselor
module.exports.getActiveSlots = async (req, res) =>{
  try {
    let counselorId = req.body.counselorId;
    console.log("counselorId: ", counselorId);
    await UpcomingSlots.find({counselorId : counselorId})
    .then(async (data) =>{
      let availability =  data[0].availability;
      availability = await availability.filter(day =>{
        return day.status === 'active'
      });
      availability = availability.map(day =>{
        let slot = day.slot.filter(slots =>{
          return slots.status == 0;
        })
        return {day : day.day, date : day.date, status : day.status, slot : slot}
      })
      res.send({data : availability, success : true, message : "slot fetched"});;
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: slot fetch error"});
    })
  }
   catch (error) {
    res.send({data : [],success : false, message: "data fetch error", error});
  }
}




// get active slot for a specific date

module.exports.getActiveSlotByDate = async (req, res) => {
  try {
    console.log("date: ", req.body);
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    console.log("thread id ", userId);
    Chat.find({ user_id: userId , counsellor_id : {$exists : true}}).sort({ _id: -1 }).limit(1)
      .then(async thread => {
        console.log("thread: ", thread);
        let date = new Date(req.body.date).toUTCString().substring(0, 16);
        console.log("date is: ", date, " counselor id: ", thread[0].counsellor_id);
        const slots = await UpcomingSlots.aggregate([
          { "$match": { "counselorId": thread[0].counsellor_id } },
          { "$unwind": "$availability" },
          { "$match": { "availability.status": "active" } },
          { "$match": { "availability.date": date } },
          { "$unwind": "$availability.slot" },
          { "$match": { "availability.slot.status": 0 } },
          {
            "$group": {
              "_id": "$_id",
              "slot": { "$push": "$availability.slot" }
            }
          }
        ]);
        if (!slots || slots.length == 0) {
          res.send({ response: {}, success: false, message: "no active slot found for this date/counsellor" });
        }
        else {
          let length = slots.length;
          console.log("slots: ", slots);
          slots[length-1].date = date;
          slots[length-1].status = "active";
          slots[length-1].day = new Date(req.body.date).getDay();
          res.send({ response: slots[length-1], success: true, message: "slots fetched" });
        }
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error: get slots for a date" });
  }
}



// Session cancel

module.exports.cancelSession = async (req, res) => {
  try {
    if(!req.body.id || !req.body.time){
      return res.send({success : false, message : "field/s missing"});
    }
    let { userId } = jwt.decode(req.params.token);
    console.log("userid: ", userId);
    let time = req.body.time;
    let slotId = req.body.id;
    let slotData = await CounselorToUser.findOne({ _id: slotId });
    console.log("slot data: ", slotData.slots);
    let date1 = new Date(slotData.date).toUTCString().substring(0, 16);
    // let timestamp1 = req.body.timestamp;
    let timestamp1 = Date.now();
    let timestamp2 = time.split("-")[0] * 1000;
    let difference = Math.floor(Math.abs(timestamp1 - timestamp2) / 36e5);
    console.log("difference: ", difference);
    // res.send({timestamp1, timestamp2});
    if (difference > 24) {
      CounselorToUser.updateOne({ _id: slotId, "slots.time": time },
        { $set: { "slots.$.status": 0 } }, { returnNewDocument: true }
      )
        .then(doc => {
          console.log("doc: ", doc);
          if(doc.nModified >= 1){
            User.updateOne({ _id: userId }, { $inc: { creditCount: 1 } })
            .then(credit => {
              // console.log("credit count update: ", credit);
              // console.log("counselor id: ", slotData.counselorId, " date1: ", date1);
              UpcomingSlots.updateOne({ counselorId: slotData.counselorId },
                { $set: { 'availability.$[a].slot.$[s].status': 0 } },
                { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
                .then(result => {
                  console.log("slot marked as active: ");
                });
              CounselorToUser.findOne({ _id: slotId })
                .then(document => {
                  res.send({ doc: document, success: true, message: "session canceled and credit increment by 1" })
                })
              // res.send({doc, success : true, message : "session canceled and credit increment by 1"});
            });
          }
          else{
            res.send({success : false, message : "nothing updated"});
          }
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error: session cancel from counselor side" });
        })
    }
    else {
      res.send({ success: false, message: "you can only cancel your bokking 24 hour before your session time." })
    }
  }
  catch (error) {
    res.send({ error, success: true, message: "unknown error" });
  }
}


// get user's session credit score

module.exports.getCreditSessionScore = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let user = await User.findById(userId, {creditCount : 1});  
    if(!user){
      res.send({success : false, message : "DB error"});
    }
    else{
      console.log("user: ", user);
      res.send({data : user.creditCount, success : true, message : "user session score count fetched"});
    }
  }
   catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}


const TestData = require('../models/testData');

module.exports.getData = (req, res) =>{
  try {
    User.find({isCanceled : true}, {_id : 1, status : 1, planExpireDate : 1})
    .then(users =>{
      res.send({users});
    })
    .catch(error =>{
      res.send({error});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}



// subscribe a plan or update a plan
// module.exports.subscribePlan = async (req, res) => {
//   try {
//     let { userId } = jwt.decode(req.params.token);
//     console.log(userId);
//     await User.findById(userId)
//       .then(doc => {
//         if (doc.trialCount === 0) {
//           console.log("let see if trial count is zero", doc.trialCount);
//           stripe.subscriptions.create({
//             customer: doc.stripeCustomerId,
//             items: [
//               {
//                 price: req.body.priceId
//               }
//             ],
//             trial_period_days: 3
//           })
//             .then(subscription => {
//               console.log("subscripton", subscription);
//               User.findOneAndUpdate({_id : userId},
//                 { $set: { subscriptionId: subscription.id , trialCount: 1} })
//                 .then(doc => {
//                   console.log("doc", doc);
//                   res.send({ data: subscription, success: true, message: "plan subscription success" });
//                 })
//                 .catch(error => {
//                   res.send({ error: error, success: false, message: "DB error in plan subscription" });
//                 });
//             })
//             .catch(error => {
//               res.send({ error: error, success: false, message: "plan subscription error" });
//             });
//         }
//         else {
//           stripe.subscriptions.update(
//             doc.subscriptionId,
//             {
//               cancel_at_period_end: false,
//               items: [{
//                 price: req.body.priceId
//               }]
//             }
//           ).then(subscription => {
//             User.findOneAndUpdate({ _id: userId },
//               { $set: { subscriptionId: subscription.id } })
//               .then(doc => {
//                 console.log("doc", doc);
//                 res.send({ data: subscription, success: true, message: "subscription update success" });
//               })
//               .catch(error => {
//                 res.send({ error: error, success: false, message: "update subscription errro for data save in db" });
//               });
//           })
//           .catch(error =>{
//             res.send({error : error, success : false, message : "subscription update error"});
//           })
//         }
//       })
//       .catch(error => {
//         console.log("error is here: ", error);
//       })
//   }
//   catch (error) {
//     res.send({ error: error, success: false, message: "something went wrong at subscription" });
//   }
// }
