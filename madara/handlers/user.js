// required modules
var mongoose = require('mongoose');
var logger = require('log4js').getLogger();
const Helper = require('./helper');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// required models
const Login = require('../models/loginModel');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
// const StripeModel = require('../models/stripeModel');
const OTP = require('../models/otpModel');
const CounselorToUser = require('../models/counselorToUser');
const Counselor = require('../models/counselorModel');
const UpcomingSlots = require('../models/upcomingAvailability');
const Chat = require('../models/chatModel');


// required Stripe modules 

const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const counselorModel = require('../models/counselorModel');
const stripe = Stripe(secretKey);


module.exports.login = async function (req, res) {
  try {
    const { username, password } = req.body;
    console.log(req.body);

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
      await Chat.findOne({ user_id: userDetails._id })
        .then(async (data) => {
          await Counselor.findById(data.counsellor_id)
            .then(result => {
              thread.counselorId = data.counsellor_id;
              thread.joinId = data.joinId;
              thread.counselorname = data.counsellorname;
              thread.counselorImage = result.photo

              const token = Helper.generateToken(userDetails._id);
              
              if (!userDetails.stripeCustomerId) {
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
                    let end_date = new Date(invoice.lines.data[0].period.start * 1000).toUTCString();
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
                    res.send({ error, success: false, message: "Stripe error: inovice detils fetch error" });
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
            nickName : req.body.nickName
          });
          user.save((error, userDetails) => {
            if (error) {
              res.send({data : {}, error: error.message, message: "username or email already taken" }).status(500);
            }
            else{
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
    await User.findOne({ email: email }, async (error, doc) => {
      if (error || !doc) {
        res.send({ error: error, success: false, message: 'DB error: no user exists' });
      }
      else {
        // console.log("doc: ", doc);
        let otp = Math.floor(Math.random() * 100000);
        let mailTransport = await nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'jfrandz85@gmail.com',
            pass: 'Jackson@123'
          }
        });

        let mailDetails = {
          from: 'jfrandz85@gmail.com',
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
          User.findOneAndUpdate({email : req.body.email}, {password : password}, {new : true})
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
                    thread.counselorname = data.counsellorname;
                    thread.counselorImage = result.photo
                })
                .catch(error =>{
                  res.send({error, success : false, message : "DB error: thread data fetch error"});
                })
              })
              .catch(error => {
                res.send({ error, success: false, message: "Thread data fetch error" });
              })

            // console.log("customerId: ", customerId);
            if(!userDetails.stripeCustomerId){
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
                  let end_date = new Date(invoice.lines.data[0].period.end * 1000).toUTCString();
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
    if(file.mimetype == 'image/jpeg' || file.mimetype == 'image/png'|| file.mimetype == 'image/jpg'){
      cb(null,'./uploads/');
    }
    if(file.mimetype == 'video/mp4'|| file.mimetype == 'video/x-matroska'){
      cb(null,'./uploads/user/videos');
    }
    if(file.mimetype == 'audio/mpeg' || file.mimetype == 'audio/mp3'){
      cb(null,'./uploads/user/audios');
    }
    if(file.mimetype == 'application/pdf' || file.mimetype == 'text/plain'){
      cb(null,'./uploads/user/attachment');
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
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
    cb(null, true);
  }
  else {
    return cb(new Error('only jpeg/png/jpg files are allowed'));
  }
}

const upload = multer({ storage : storage, fileFilter :fileFilter }).single('image');


module.exports.profilePictureUpload = (req, res) => {
  upload(req, res,(error) =>{
    if(error){
      res.send({data : {}, success : false, error, message : "file upload error" });
    }
    else{
      try {
        
        let {userId} = jwt.decode(req.params.token);
        User.findByIdAndUpdate({_id : userId},
          [{$set : {profilePhoto : req.file.filename}}],{upsert : true, new : true})
          .then((result, error) =>{
            if(error){
              res.send({data : {}, error, success : false, message : "error in file upload"});
            }
            res.send({data : result, message: "image uploaded", success: true }).status(201);
          })
          .catch(error => res.send({error, message: "image upload error", success: false }).status(201));
      }

      catch (error) {
        res.send({ data : {}, success : false, error, message : " invalid request" }).status(203);
      }
    }
  });
}


module.exports.audioVideoUpload = async (req, res) =>{
  try {
    console.log("req.file.mimetype: ", req.body);
    let fileSize = 20 * 1024 *1024;
    const fileFilter = (req, file, cb) => {
      if (file.mimetype == 'video/mp4' || file.mimetype == 'audio/mpeg' || 
      req.file.mimetype === 'video/x-matroska' || file.mimetype == 'audio/mp3') {
        cb(null, true);
      } 
      else {
          // cb(null, false);
          return cb(new Error('only mp4 or mp3/mpeg files are allowed'));
      }
    }
    const upload = multer({
      storage : storage, 
      fileFilter : fileFilter, 
      limits : {fileSize : fileSize}}).single('file');
    upload(req, res, (error) =>{
      if(error){
        res.send({error, success : false, message : "only mp4 or mp3/mpeg files are allowed"});
      }
      else{
        let { userId } = jwt.decode(req.params.token);
        let chatData = new Chat({
          user_id : userId,
          username : req.body.username,
          user_image : req.body.user_image,
          counsellor_id : req.body.counsellor_id,
          counsellorname : req.body.counsellorname,
          joinId : req.body.joinId,
          message : req.file.mimetype === 'video/mp4' ? "video/" + req.file.filename :"audio/" + req.file.filename,
          fileupload : req.file.mimetype,
          message_type : req.file.mimetype==='video/mp4'||req.file.mimetype==='video/x-matroska'  ? "video" : "audio",
          time : Date.now(),
          id : req.body.id
        });
        chatData.save()
        .then(doc => {
          console.log("doc: ", doc);
          res.send({ 
            data: doc.fileupload, 
            success : true, 
            message: "you just uploaded a file" 
          });
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error: attachment data save error" });
        })
      }
    })
  } 
  catch (error) {
    res.send({error, message : " you just got an error in file upload"});
  }
}

// for attachment

module.exports.attachment = (req, res) => {
  try {
    const fileFilter = (req, file, cb) => {
      if (file.mimetype == 'application/pdf' || file.mimetype == 'text/plain') {
        cb(null, true);
      }
      else {
        // cb(null, false)
        cb(new Error('only pdf or txt files are allowed'));
      }
    }
    const upload = multer({ storage: storage, fileFilter: fileFilter }).single('file');
    upload(req, res, async (error) => {
      if (error) {
        res.send({ error, success: false, message: "only pdf or txt files are allowed" });
      }
      else {
        let { userId } = jwt.decode(req.params.token);
        // let userId = req.params.token;
        let chatData = new Chat({
          user_id : userId,
          username : req.body.username,
          user_image : req.body.user_image,
          counsellor_id : req.body.counsellor_id,
          counsellorname : req.body.counsellorname,
          joinId : req.body.joinId,
          message : "attachment/" + req.file.filename,
          fileupload : "attachment",
          message_type : req.file.mimetype,
          time : Date.now(),
          id : req.body.id
        });
        chatData.save()
          .then(doc => {
            console.log("doc: ", doc);
            res.send({ 
              data: "attachment/" + req.file.filename, 
              success : true, 
              message: "you just uploaded a file" 
            });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error: attachment data save error" });
          })
      }
    })
  }
  catch (error) {
    res.send({ error, success : false, message: " you just got error in attachment" });
  }
}



// nick name or email update

module.exports.updateNickName = (req, res) => {
  try {
    let {userId} = jwt.decode(req.params.token);
    // let userId = req.params.token;
    if (!req.body.email && !req.body.nickName) {
      res.send({ data: {}, success: false, message: "nothing update" });
    }
    else{
      if(req.body.email && req.body.nickName){
        User.findByIdAndUpdate({_id : userId},
          [{$set : {nickName : req.body.nickName, email : req.body.email}}],{new : true})
          .then((result, error) =>{
            if(error){
              res.send({data : {}, error, success : false, message : "DB erro in nick name update"});
            }
            res.send({data : result, message: "nick name uodated", success: true }).status(201);
          })
          .catch(error => res.send({error, message: "DB error in nick name update", success: false }).status(201));
      }
      else {
        if (!req.body.email) {
          User.findByIdAndUpdate({_id : userId},
            [{$set : {nickName : req.body.nickName}}],{new : true})
            .then((result, error) =>{
              if(error){
                res.send({data : {}, error, success : false, message : "DB erro in nick name update"});
              }
              res.send({data : result, message: "nick name uodated", success: true }).status(201);
            })
            .catch(error => res.send({error, message: "DB error in nick name update", success: false }).status(201));
        }
        if (!req.body.nickName) {
          User.findByIdAndUpdate({_id : userId},
            [{$set : {email : req.body.email}}],{new : true})
            .then((result, error) =>{
              if(error){
                res.send({data : {}, error, success : false, message : "DB erro in nick name update"});
              }
              res.send({data : result, message: "nick name uodated", success: true }).status(201);
            })
            .catch(error => res.send({error, message: "DB error in nick name update", success: false }).status(201));
        }
      }
    }
  }
  catch (error) {
    res.send({ data: {}, success: false, error, message: " invalid request" }).status(203);
  }
}




// get all questions
module.exports.getQuestions = (req, res) => {
  try {
    Question.find({}, (error, doc) => {
      if (error) {
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
    let customerId = req.body.customerId;
    console.log(customerId);
    await stripe.invoices.list({
      customer: customerId
    })
      .then(invoices => {
        console.log("inovices: ",inovices);
        stripe.invoices.retrieve(
          invoices.data[0].id
        )
          .then(invoiceItem => {
            let end_date = new Date(invoiceItem.lines.data[0].period.end * 1000).toUTCString();
            stripe.products.retrieve(invoices.data[0].lines.data[0].price.product)
              .then(product => {
                let invoiceData = {
                  amount_paid: invoiceItem.amount_paid,
                  exp_date: end_date,
                  plan_name: product.name
                }
                res.send({ data: invoiceData, success: true, message: "product fetched" });
              });
          });
      })
      .catch(error => {
        res.send({ error, success: false, message: "stripe inovice fetch error" });
      });
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

    User.findById(userId)
    .then(doc =>{
      if (doc.subscriptionId !== null) {
        stripe.subscriptions.retrieve(
          doc.subscriptionId
        )
        .then(subscription =>{
          stripe.subscriptions.update(
            doc.subscriptionId,
            {
              cancel_at_period_end: false,
              items: [{
                price: req.body.priceId,
                id : subscription.items.data[0].id
              }],
              trial_end: 'now',
              billing_cycle_anchor: 'now'
            }
          )
          .then(subscription => {
            User.findOneAndUpdate({ _id: userId },
              { $set: { subscriptionId: subscription.id } })
              .then(doc => {
                // console.log(`doc: ${doc}`);
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
          customer: doc.stripeCustomerId,
          items: [
            { price : req.body.priceId },
          ],
          trial_end : 'now'
        })
        .then(subscription => {
          // console.log("subscription: ",subscription);
          User.findOneAndUpdate({ _id: userId },
            { $set: { subscriptionId: subscription.id , status : 'active'} })
            .then(doc => {
              // console.log("doc: ", doc);
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
    User.findOne({ stripeCustomerId: req.body.stripeCustomerId })
      .then(result => {
        stripe.subscriptions.retrieve(
          result.subscriptionId
        )
        .then(subscription =>{
          console.log(new Date(subscription.current_period_start * 1000).toUTCString());
          res.send({data : subscription});
        });
        // stripe.subscriptions.del(result.subscriptionId)
        //   .then(response => {
        //     result.status = 'inactive';
        //     result.subscriptionId = null;
        //     result.save()
        //       .then(doc => {
        //         res.send({ response, success: true, message: "subscription canceled" });
        //         console.log("response: ", response);
        //       })
        //       .catch(error => {
        //         res.send({ error, success: false, message: "DB error in user status update" });
        //       });

        //   })
        //   .catch(error => {
        //     console.log(error, "error");
        //     res.send({
        //       error: error,
        //       success: false,
        //       message: error.raw.message
        //     });
        //   });
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
          User.updateOne({ stripeCustomerId: req.body.stripeCustomerId },
            { $set: { cardDetails: cardDetails }},{upsert : true, new : true})
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
    // console.log(req.body);
    let { userId } = jwt.decode(req.params.token);
    if (!req.body.stripeCustomerId) {

      const customer = await stripe.customers.create({
        email: req.body.email,
        name: req.body.username,
        description: 'one time payment',
        address: req.body.address
      });

      const token = await stripe.tokens.create({
        card: {
          number: req.body.cardNumber,
          exp_month: req.body.expMonth,
          exp_year: req.body.expYear,
          cvc: req.body.cvc,
        },
      });
      
      stripe.customers.createSource(customer.id,{
        source: token.id
      })
      .then(async (source) =>{
        console.log("source :", source.id);
      })
      .catch(error =>{
        console.log("error: ", error);
      })
      await stripe.charges.create({
        amount: 2000,
        currency: 'usd',
        source: source.id,
        customer: customer.id,
        description: 'One time payment ',
      })
      .then(async (charge) =>{
        console.log("charge: ", charge);
        const slotData = new CounselorToUser({
          counselorId: req.body.counselorId,
          userId: userId,
          slots: {
            date: req.body.date,
            time: [req.body.time]
          }
        });
        await slotData.save()
        .then(slot =>{
          res.send({data : slot, success : false, message : "session book success"});
        })
        .catch(error =>{
          res.send({error , success : false, message : "DB error in session data save" });
        })
      })
      .catch(error =>{
        res.send({error, success : false, message : "payment error: something wrong with card"});
      })
    }
    else {
      User.findById(userId)
        .then(user => {
          stripe.charges.create({
            amount: 2000,
            currency: 'usd',
            source: user.cardDetails.cardId,
            customer: req.body.stripeCustomerId,
            description: 'My First Test Charge (created for API docs)',
          })
            .then(charge => {
              console.log("charge: ",charge);
              const slotData = new CounselorToUser({
                counselorId: req.body.counselorId,
                userId: userId,
                slots: {
                  date: req.body.date,
                  time: [req.body.time]
                },
                date: req.body.date
              });
              console.log(slotData);
              slotData.save()
                .then(document => {
                  res.send({ document, success: true, message: "slot book success" });
                })
                .catch(error => {
                  res.send({ error, success: false, message: "DB error in slot data save" });
                })
            })
            .catch(error => {
              res.send({ error, successc: false, message: "card charge error" });
            })
        })
        .catch(error => {
          res.send({ error, success: false, message: "Stripe token create error" });
        })
    }
  }
  catch (error) {
    res.send({ error, success: false, message: " Something went wrong in book slot data save" });
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

module.exports.getActiveSlotByDate = async (req, res) =>{
  try {
    let counselorId = req.body.counselorId;
    let date = new Date(req.body.date).toDateString();
    console.log("date is: ", date);
    const slots = await UpcomingSlots.find(
      {counselorId : counselorId},
      {availability : {$elemMatch : {date : date}}}
      );
    res.send({slots});
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error: get slots for a date"});
  }
}



// Session cancel

module.exports.cancelSession = (req, res) =>{
  try {
    let { userId } = req.params.token;
    console.log(userId);
    const slot = {
      date : req.body.date,
      time : [req.body.time]
    }  
  } 
  catch (error) {
    res.send({error});
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
