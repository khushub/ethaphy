// required modules
var mongoose = require('mongoose');
var logger = require('log4js').getLogger();
const Helper = require('./helper');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {response} = require('express');

// required models
const Login = require('../models/loginModel');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
const StripeModel = require('../models/stripeModel');
const OTP = require('../models/otpModel');
const CounselorToUser = require('../models/counselorToUser');


// required Stripe modules 

const myEnv = require('dotenv').config();
const secretKey = myEnv.parsed.STRIPE_KEY;

const Stripe = require('stripe');
const stripe = Stripe(secretKey);


module.exports.login = function (req, res) {
  try {
    const { username, password } = req.body;
    console.log(req.body);

    /* condition for email, password are not null */

    if (!username || !password) {
      return res.send({
        data : {},
        status: "fail",
        fail: {
          errorCode: 400,
          message: "username or password missing"
        }
      });
    };


    User.findOne({ username: req.body.username }, function (err, userDetails) {
      if (err) {
        logger.error('login: DBError in finding user details.');
        return;
      }
      if (!userDetails) {
        return res.send({ error: err, success: false  ,message: "No user exist with this username"}).status(401);
      }

      /* condition for compare password with users table data */

      if (!Helper.comparePassword(userDetails.password, password)) {
        return res.send({data : {}, error: "Invalid Password" , success : false}).status(403);
      };

      logger.info('login: ' + userDetails.username + ' logged in.');
      userDetails.fcmToken = req.body.fcmToken;
      userDetails.save().then(doc => console.log("doument: ", doc));
      const token = Helper.generateToken(userDetails._id);
      const data = {
        userDetails,
        token
      }
      return res.send({ data: data,success : true, message: "User login success" }).status(200);
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
            fcmToken : req.body.fcmToken
          });
          user.save((error, response) => {
            if (error) {
              res.send({data : {}, error: error.message, message: "username or email already taken" }).status(500);
            }
            else{
                let dummyAssignedData = new CounselorToUser({
                  counselorId : "5fc9cb88db493e26f44e9622",
                  userId : response.id
                });
                dummyAssignedData.save()
                .then(doc =>{
                  console.log(`dummy counselor assigned to user`);
                })
                .catch(error =>{
                  console.log(`user ko dummy counselor assing karne me DB error`);
                })
              const token =  Helper.generateregisterationToken(response.id);
              let data = {
                response,
                token
              }
              res.send({ data: data, success: true, message: "User Registered Successfully" });
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
let otp;

module.exports.forgotPassword = (req, res) => {
  try {
    const email = req.body.email;
    User.findOne({ email: email }, (error, doc) => {
      if (error) {
        res.send({ error: error, success: false, message: 'DB error during fetch user' });
      }
      if (!doc) {
        res.send({ error: error, success: false, message: 'No user found with this email address' })
      }
      else {
        // console.log("error in else");
        otp = Math.floor(Math.random() * 100000);
        let mailTransport = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'edwy23@gmail.com',
            pass: '***********'
          }
        });

        let mailDetails = {
          from: 'edwy23@gmail.com',
          to: email,
          subject: 'Test mail',
          text: otp.toString()
        }

        mailTransport.sendMail(mailDetails, (error, response)=>{
          if(error){
            res.send({error : error, success : false, message: "Error in otp send" });
          }
          else{
            res.send({response : response, success : true, message : "OTP sent to your mail"});
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
  if(otp === req.body.otp){
    res.send({success : true, message : "OTP verifification success"});
  }
  else{
    res.send({success : false, message : "OTP verifification fail"});
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
module.exports.getUserById = (req, res) => {
  try {
    let {userId}  = jwt.decode(req.params.token);
    console.log(`userid`, userId);
    CounselorToUser.findOne({ userId: userId })
    .then(doc =>{
      User.findById(userId, (error, user) => {
        if (error) {
          res.send({ data: {}, error: error.message, success: false, message: 'DB error during fetch user' });
        }
        if (!user) {
          res.send({ data: {}, error: error, success: false, message: 'No user found with this id' });
        }
  
        else {
          res.send({ data: user, success: true, message: 'User fetched for my profile section' });
        }
      })
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error"});
    });
  }
  catch (error) {
    res.send({ error: error.message, success: false, message: 'DB error while making request for fetch user' });
  }
}


// file upload module
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null,'./uploads/');
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
          [{$set : {profilePhoto : req.file.path}}],{upsert : true})
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



// Update subscription plan

module.exports.updatePlan = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    User.findById(userId)
    .then(doc =>{
      stripe.subscriptions.update(
        doc.subscriptionId,
        {
          cancel_at_period_end: false,
          items: [{
            price: req.body.priceId
          }],
          trial_end : now,
          billing_cycle_anchor: 'now',
          payment_behavior: 'pending_if_incomplete'
        }
      ).then(subscription => {
        User.findOneAndUpdate({ _id: userId },
          { $set: { subscriptionId: subscription.id } })
          .then(doc => {
            console.log(`doc: ${doc}`);
            res.send({ data: subscription, success: true, message: "subscription update success" });
          })
          .catch(error => {
            res.send({ error: error, success: false, message: "DB update error"});
          });
      })
      .catch(error =>{
        res.send({error : error, success : false, message : "subscription update error"});
      })
    }) 
  }
   catch (error) {
    res.send({error, success : false, message : "something went wrong with subscription update"});
  }
}


module.exports.cancelTrial = (req, res) => {
  StripeModel.findOne({ stripeCustomerId: req.params.stripeCustomerId })
    .then(result => {
      console.log(result);
      stripe.subscriptions.update(result.subscriptionId, {
        trial_end: 'now',
      })
        .then(response => {
          console.log(`response: ${response}`);
        })
        .catch(error => {
          console.log(error, "error");
          res.send({ error: error, success: false, message: "trial cancelation error" });
        });
    })
    .catch(error => {
      res.send({ error: error, success: false, message: "trial cancelation error" });
    })
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
            req.params.stripeCustomerId,
            card.id
          )
          User.updateOne({ stripeCustomerId: req.params.stripeCustomerId },
            { $set: { cardDetails: cardDetails } })
            .then(result => {
              console.log("result", result);
            })
            .catch(error => {
              console.log("error", error);
            });
          res.send({ data: card, success: true, message: "card details updated" });
        })
        .catch(error => {
          res.send({ error: error, success: false, message: "card update error" });
        });
    })
    .catch(error => {
      res.send({ error: error, success: false, message: "token create error in card update" });
    })
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
//                 res.send({ error: error, success: false, message: "update subscriptioin errro for data save in db" });
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

