// required modules
var mongoose = require('mongoose');
var logger = require('log4js').getLogger();
const Helper = require('./helper');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// required models
const Login = require('../models/loginModel');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
const OTP = require('../models/otpModel');
const nodemailer = require('nodemailer');
const { response } = require('express');


module.exports.login = function (req, res) {
  try {
    const { username, password } = req.body;
    console.log(req.body);

    /* condition for email, password are not null */

    if (!username || !password) {
      return res.send({
        status: "fail",
        fail: {
          errorCode: 400,
          message: "required field is missing"
        }
      });
    };


    User.findOne({ username: req.body.username }, function (err, userDetails) {
      if (err) {
        logger.error('login: DBError in finding user details.');
        return;
      }
      if (!userDetails) {
        return res.send({ error: error.message, message: "No data found", success: true });
      }

      /* condition for compare password with users table data */

      if (!Helper.comparePassword(userDetails.password, password)) {
        return res.send({ error: "Invalid Password" }).status(402);
      };

      logger.info('login: ' + userDetails.username + ' logged in.');
      const token = Helper.generateToken(userDetails._id);
      const data = {
        userDetails,
        token
      }
      return res.send({ data: data, message: "Sent succcessfully" }).status(200);
      // return token;
    })
  }
  catch (error) {
    res.send({ error: error.message }).status(500);
  }
};



module.exports.createUser = function (req, res) {
  try {
    // check if all field is available
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.send({ error: "All input field require" }).status(400);
    }

    // check if user exist
    User.findOne({ email: req.body.email }, (err, user) => {
      if (err) {
        res.send({ error: err, message: "Db error" }).status(500);
      }
      if (!user) {
        const user = new User({
          username: req.body.username,
          email: req.body.email,
          // mobileNo: req.body.mobileNo,
          password: Helper.hashPassword(req.body.password),
          role: req.body.role,
          status: req.body.status,
          feeling: req.body.feeling,
          challenge: req.body.challenge,
          arealife: req.body.arealife,
          description: req.body.description,
          sucideattempt: req.body.sucideattempt,
          counsellingattempt: req.body.counsellingattempt,
          age: req.body.age,
          country: req.body.country,
          state: req.body.state,
          relationshipstatus: req.body.relationshipstatus,
          genderidentity: req.body.genderidentity,
          sexualorientation: req.body.sexualorientation,
          religousspitual: req.body.religousspitual,
          painorillness: req.body.painorillness,
          medicinestatus: req.body.medicinestatus,
          ready: req.body.ready,
          deleted: req.body.deleted,
        });
        user.save((error, response) => {
          if (error) {
            res.send({ error: error.message, message: "DB error" }).status(500);
          }
          let data = {
            id: response._id,
            username: response.username,
            deleted: response.deleted,
            status: response.status
          }
          res.send({ data: data, message: "User Created", success: true });
        })

        // User.create(user);
        // return res.send({ data: user, message: "user created" });
      }
      else {
        return res.send({ data: {}, message: "user already exist", success: true }).status(402);
      }
    })

  }
  catch (error) {
    res.send({ error: error.message, message: "Error while registration" }).status(500);
  }
}


module.exports.forgotPassword = (req, res) => {
  try {
    const email = req.body.email;
    User.findOne({ email: email }, (error, doc) => {
      if (error) {
        res.send({ error: error.message, message: 'DB error during fetch user', success: true });
      }
      if (!doc) {
        res.send({ error: error.message, message: 'No user found with this email address', success: true })
      }
      else {
        console.log("error in else");
        const otp = Math.floor(Math.random() * 100000);
        let mailTransport = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'edwy23@gmail.com',
            pass: 'Rahul%!8126'
          }
        });

        let mailDetails = {
          from: 'edwy23@gmail.com',
          to: 'rahul.168607@knit.ac.in',
          subject: 'Test mail',
          text: otp.toString()
        }

        mailTransport.sendMail(mailDetails, (error, res)=>{
          if(error) console.log("error in sending mail: ",error);
          else{
            console.log('mail send successfully', res);
          }
        })
        console.log("otp", OTP);
        OTP.findOne({ email: email }, (error, result) => {
          if (error) {
            console.log(error.message);
          }
          if (!result) {
            let doc = new OTP({
              otp: otp,
              email: email
            });
            doc.save();
          }
          else {
            OTP.updateOne({ email: email }, { otp: otp }, (error, response) => {
              if (error) {
                console.log(error);
              }
              else {
                console.log("updated document: ", response);
              }
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


module.exports.resetPassword = (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      res.send({ error: 'mismatch confirm password with new password', success : true });
    }
    else {
      let { userId } = jwt.decode(req.params.token);
      User.findById(userId, (error, user) => {
        if (error) {
          res.send({ error: error.message, message: 'DB error in Reset Password' , success : true});
        }
        if (!user) {
          res.send({ error: error, message: 'No user found with such id', success: true });
        }
        else {
          let { password } = user;

          if (!Helper.comparePassword(password, currentPassword)) {
            return res.send({ error: "Incorrect current password", success : true }).status(402);
          }

          else{
            user.password = Helper.hashPassword(newPassword);
            user.save((error,doc)=>{
              if(error){
                res.send({error : error.message, message : 'Reset Password DB error', success : true});
              }
              if(!doc){
                res.send({error : error.message, message : 'No user password updated', success : true});
              }
              else{
                res.send({data : doc, message : 'password reset successfully', success : true});
              }
            })
          }
        }
      })
    }
  }
  catch (error) {
    res.send({error : error.message, message : 'Unknown error in reset password', success : true});
  }
}


module.exports.getUserById = (req, res) => {
  try {
    let {userId} = jwt.decode(req.params.token);
    User.findById(userId, (error, doc) => {
      if (error) {
        res.send({ error: error.message, message: 'DB error during fetch user', success: true });
      }
      if (!doc) {
        res.send({ error: error, message: 'No user found with this id', success: true });
      }

      else {
        res.send({ data: doc, message: 'User fetched by id', success: true });
      }
    })
  }
  catch (error) {
    res.send({ error: error.message, message: 'DB error during fetch user', success: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },

  filename: function (req, file, cb) {
    let originalname = file.originalname;
    let extension = originalname.split(".");
    filename = Date.now() + "." + extension[extension.length - 1];
    cb(null, filename);
  },
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const upload = multer({ storage: storage, fileFilter: fileFilter })


module.exports.profilePictureUpload = (req, res) => {
  try {
    console.log("update me error aa gyi ");
    User.updateOne({ email: email }, { image: upload.single('image') }, { upsert: true });
    // upload.single('image');
    res.send({ message: "File uploaded success", success: true }).status(201);
  }
  catch (error) {
    res.send({ message: "file upload error", success: true }).status(203);
  }
}



module.exports.getQuestions = (req, res) => {
  try {
    console.log("get questions by id");
    Question.find({}, (error, doc) => {
      if (error) {
        res.send({ error: error.message, message: 'DB error during fetch questions', success: true });
      }
      if (doc.length > 0) {
        res.send({ data: doc[0], message: 'Questions fetched', success: true });

      }

      else {
        res.send({ error: error, message: 'No Questions details found', success: true });
      }
    })
  }
  catch (error) {
    res.send({ error: error.message, message: 'DB error during fetch Questions', success: true });
  }
}

