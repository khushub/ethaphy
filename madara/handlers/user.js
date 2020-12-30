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
// const Counselor = require('../models/counselorModel');
const Slots = require('../models/slotModel');
const Chat = require('../models/chatModel');
// const 


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
        data : {},
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
        return res.send({ error: err, success: false  ,message: "No user exist with this username"}).status(401);
      }

      /* condition for compare password with users table data */

      if (!Helper.comparePassword(userDetails.password, password)) {
        return res.send({data : {}, error: "Invalid Password" , success : false}).status(403);
      };

      let date = new Date().toISOString().substring(0,10);
      // let date = new Date("2020-12-29").toISOString().substring(0,10);
      let slotData = {};
      CounselorToUser.find({userId : userDetails._id ,date : { $gt : date}})
      .then(doc =>{
        slotData.date = doc[0].date;
        slotData.slots = doc[0].slots;
        console.log(slotData);
      })
      .catch(error =>{
        return slotData = {};
      });

      // console.log("slotData: ", slotData, userDetails._id);
      logger.info('login: ' + userDetails.username + ' logged in.');
      userDetails.fcmToken = req.body.fcmToken;
      userDetails.save().then(doc => console.log("doument saved"));

      // Chat related data
      let thread = {};
      await Chat.findOne({user_id : userDetails._id})
       .then(data =>{
        thread.counselorId = data.counsellor_id;
        thread.joinId = data.joinId;
        thread.counsellorname = data.counsellorname;
        console.log(thread.counselorId);
      })
      .catch(error =>{
        res.send({error, success : false, message : "Thread data fetch error"});
      })
      console.log("thread : ", thread);
      // userDetails.thread = thread;

      const token = Helper.generateToken(userDetails._id);
      let customerId = userDetails.stripeCustomerId;
      stripe.invoices.list({
        customer: customerId,
        limit: 3
      })
      .then(invoices =>{
        // console.log("invoices: ", invoices);
        stripe.invoices.retrieve(
          invoices.data[0].id
        )
        .then(invoiceItem => {
          let end_date = new Date(invoiceItem.lines.data[0].period.end * 1000).toUTCString();
          stripe.products.retrieve(invoices.data[0].lines.data[0].price.product)
            .then(product => {
              let membership = {
                amount_paid: invoiceItem.amount_paid,
                exp_date: end_date,
                plan_name: product.name
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
            .catch(error =>{
              res.send({error, success : false, message : "product details fetch error"});
            });
        })
        .catch(error =>{
          res.send({error, success : false, message : "invoice item fetch error"});
        });
      })
      .catch(error =>{
        res.send({error, success : false, message : "Stripe invoice fetch error"});
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
                  const chatData = new Chat({
                    user_id : response._id,
                    username : response.username,
                    counsellor_id : "5fc9cb88db493e26f44e9622",
                    counsellorname : "Ares mink",
                    joinId : response._id + "5fc9cb88db493e26f44e9622",
                  });
                  chatData.save();
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

module.exports.forgotPassword = (req, res) => {
  try {
    const email = req.body.email;
    User.findOne({ email: email }, (error, doc) => {
      if (error || !doc) {
        res.send({ error: error, success: false, message: 'DB error or no user exists' });
      }
      else {
        // console.log("error in else");
        let otp = Math.floor(Math.random() * 100000);
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
          if(error || !response){
            res.send({error : error, success : false, message: "Error in mail send : OTP" });
          }
          else{
            const otpData = {
              email : email,
              otp : otp
            }
            otpData.save()
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
      console.log(doc);
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error in otp details fetch"});
    })  
  } 
  catch (error) {
    
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
    // console.log(`userid`, userId);
    CounselorToUser.findOne({ userId: userId })
    .then(doc =>{
      User.findById(userId, async (error, userDetails) => {
        if (error) {
          res.send({ data: {}, error: error.message, success: false, message: 'DB error during fetch user' });
        }
        if (!userDetails) {
          res.send({ data: {}, error: error, success: false, message: 'No user found with this id' });
        }
  
        else {
          let date = new Date().toISOString().substring(0,10);
      // let date = new Date("2020-12-29").toISOString().substring(0,10);
          let slotData = {};
          CounselorToUser.find({userId : userDetails._id ,date : { $gt : date}})
          .then(doc =>{
            slotData.date = doc[0].date;
            slotData.slots = doc[0].slots;
            // console.log(slotData);
          })
          .catch(error =>{
            return slotData = {};
          });

          let thread = {};
          await Chat.findOne({user_id : userDetails._id})
           .then(data =>{
            thread.counselorId = data.counsellor_id;
            thread.joinId = data.joinId;
            // console.log(thread.counselorId);
          })
          .catch(error =>{
            res.send({error, success : false, message : "Thread data fetch error"});
          })

          // console.log("thread data: ", thread);
          let customerId = userDetails.stripeCustomerId;
          // console.log("customerId: ", customerId);
          stripe.invoices.list({
            customer: customerId,
            limit: 3
          })
          .then(invoices =>{
            // console.log("invoices: ", invoices);
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
                    plan_name: product.name,
                    priceId : invoices.data[0].lines.data[0].price.id
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
                  res.send({error, success : false, message : "product details fetch error"});
                });
            })
            .catch(error =>{
              res.send({error, success : false, message : "invoice item fetch error"});
            });
          })
          .catch(error =>{
            res.send({error, success : false, message : "Stripe invoice fetch error"});
          })
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
          [{$set : {profilePhoto : req.file.path}}],{upsert : true, new : true})
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




module.exports.updateNickName = (req, res) => {
      try {
        let {userId} = jwt.decode(req.params.token);
        User.findByIdAndUpdate({_id : userId},
          [{$set : {nickName : req.body.nickName}}],{upsert : true, new : true})
          .then((result, error) =>{
            if(error){
              res.send({data : {}, error, success : false, message : "DB erro in nick name update"});
            }
            res.send({data : result, message: "nick name uodated", success: true }).status(201);
          })
          .catch(error => res.send({error, message: "DB error in nick name update", success: false }).status(201));
      }
      catch (error) {
        res.send({ data : {}, success : false, error, message : " invalid request" }).status(203);
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
      customer: customerId
    })
    // console.log(typeof pastInvoices, " past invoices: ", pastInvoices.data[0].id  );
    let invoices = [];
    for(let i=0; i< pastInvoices.data.length; i++){
      // console.log("past invoice ", pastInvoices.data);
      stripe.invoices.retrieve(
        pastInvoices.data[i].id
      )
      .then(item =>{
        let end_date = new Date(item.lines.data[0].period.end * 1000).toUTCString();
        // stripe.products.retrieve(invoices.data[i].lines.data[0].price.product)
        console.log("item data: ",item.lines.data[0].price.product);
        stripe.products.retrieve(item.lines.data[0].price.product)
        .then(product =>{
          console.log("product: ", product);
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
    console.log("inovices: ", invoices);
    res.send({invoices, success : true, message : "data fetch success"});
  }
  catch (error) {
    res.send({ error, success: false, message: "something went wrong in get past invoices" });
  }
}


// console.log("inovices: ",inovices);
//         stripe.invoices.retrieve(
//           invoices.data[0].id
//         )
//           .then(invoiceItem => {
//             let end_date = new Date(invoiceItem.lines.data[0].period.end * 1000).toUTCString();
//             stripe.products.retrieve(invoices.data[0].lines.data[0].price.product)
//               .then(product => {
//                 let invoiceData = {
//                   amount_paid: invoiceItem.amount_paid,
//                   exp_date: end_date,
//                   plan_name: product.name
//                 }
//                 res.send({ data: invoiceData, success: true, message: "product fetched" });
//               });
//           });




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
                console.log(`doc: ${doc}`);
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
        console.log('in else:');
        stripe.subscriptions.create({
          customer: doc.stripeCustomerId,
          items: [
            { price : req.body.priceId },
          ],
          trial_end : 'now'
        })
        .then(subscription => {
          console.log("subscription: ",subscription);
          User.findOneAndUpdate({ _id: userId },
            { $set: { subscriptionId: subscription.id , status : 'active'} })
            .then(doc => {
              console.log("doc: ", doc);
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
    console.log(result);
    stripe.subscriptions.del(result.subscriptionId)
      .then(response => {
        result.status  = 'inactive';
        result.subscriptionId = null;  
        result.save()
        .then(doc=>{
          res.send({response, success : true, message: "subscription canceled"});
          console.log("response: ", response);
        })
        .catch(error =>{
          res.send({error, success : false, message : "DB error in user status update"});
        });
        
      })
      .catch(error => {
        console.log(error, "error");
        res.send({ 
          error: error, 
          success: false, 
          message: error.raw.message 
        });
      });
  })
  .catch(error => {
    res.send({ error: error, success: false, message: "might be DB error or stripe error"});
  })  
 } 
 catch (error) {
  res.send({ error: error, success: false, message: "Something goes wrong in subscription cancelation"});
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
      stripe.customers.create({
        email: req.body.email,
        name: req.body.username,
        description: 'one time payment',
        address : req.body.address
      })
        .then(customer => {
          stripe.tokens.create({
            card: {
              number: req.body.cardNumber,
              exp_month: req.body.expMonth,
              exp_year: req.body.expYear,
              cvc: req.body.cvc,
            },
          })
            .then(token => {
              stripe.charges.create({
                amount: 2000,
                currency: 'usd',
                source: token.id,
                customer: customer.id,
                description: 'My First Test Charge (created for API docs)',
              });
            })
              .then(charge =>{
                console.log("charge: ", charge);
                const slotData = new CounselorToUser({
                  counselorId: req.body.counselorId,
                  userId: userId,
                  slots: {
                    date : req.body.date,
                    time : [req.body.time]
                  }
                });
                // console.log(slotData);
                slotData.save()
                  .then(document => {
                    res.send({ document, success: true, message: "slot book success" });
                  })
                  .catch(error => {
                    res.send({ error, success: false, message: "DB error in slot data save" });
                  })
              })
            .catch(error =>{
              res.send({error, success : false, message : "stripe card token create error"});
            })
        })
        .catch(error => {
          res.send({ error, success: false, message: "stripe error" });
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
        .then(charge =>{
          const slotData = new CounselorToUser({
            counselorId: req.body.counselorId,
            userId: userId,
            slots: {
              date : req.body.date,
              time : [req.body.time]
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
        .catch(error=>{
          res.send({error, successc : false, message : "card charge error"});
        })
      })
      .catch(error =>{
        res.send({error, success : false, message : "Stripe token create error"});
      })
    }
  }
  catch (error) {
    res.send({ error, success: false, message: " Something went wrong in book slot data save" });
  }
}



// user will get enable slots of a counselor
module.exports.getEnableSlots = async (req, res) =>{
  try {
    let counselorId = req.body.counselorId;
    let slots = await Slots.find({counselorId : counselorId, date : req.body.date});
    let enableSlots = [];
    if(slots[0].status === 'active'){
      for(let i=0, j=0; i < slots[0].slot.length; i++){
        if(slots[0].slot[i].status === 0){
          enableSlots[j] = slots[0].slot[i].time;
          j++;
        }
      }  
    }
    res.send({data: enableSlots, success : true, message : "data fetched"});
  }
   catch (error) {
    res.send({data : [],success : false, message: "data fetch error", error});
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
