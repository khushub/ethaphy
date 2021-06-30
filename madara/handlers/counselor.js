const Helper = require('../handlers/helper');
var logger = require('log4js').getLogger();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const moment = require('moment');
const mongodb = require('mongodb').ObjectID;
const myEnv = require('dotenv').config();
const util = require('./util');

// required model
const Counselor = require('../models/counselorModel');
const Slot = require('../models/slotModel');
const CounselorToUser = require('../models/counselorToUser');
const OTP = require('../models/otpModel');
const userModel = require('../models/userModel');
const UpcomingSlots = require('../models/upcomingAvailability');
const Chat = require('../models/chatModel');
const CounselorPayment = require('../models/counselorPayment');
const { times, join } = require('lodash');


// required Stripe modules 

const secretKey = myEnv.parsed.STRIPE_KEY;
const Stripe = require('stripe');
const stripe = Stripe(secretKey);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
      cb(null, './uploads/');
    }
    if (file.mimetype == 'video/mp4') {
      cb(null, './uploads/counselr/introVideo/');
    }

    if(file.mimetype == 'audio/mpeg' || file.mimetype == 'audio/mp3' || file.mimetype == 'audio/x-m4a'){
      cb(null, './uploads/user/audios/');
    }

    if (file.mimetype == 'application/pdf' || file.mimetype == 'application/msword'
      || file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, './uploads/counselor/files');
    }
  },

  filename: (req, file, cb) => {
    let originalname = file.originalname;
    let extension = originalname.split(".");
    filename = Date.now() + "." + extension[extension.length - 1];
    cb(null, filename);
  },
});



// Counselor Registeration

module.exports.createCounselor = async function (req, res) {
  const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }

  const upload = multer({ storage: storage, fileFilter: fileFilter }).single('photo');
  upload(req, res, (err) => {
    if (err) {
      console.log(err);
      res.send({ error: err, success: false, message: "file upload error" })
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

                photo: req.file.filename,

                designations: req.body.designations,
                specialities: req.body.specialities,
                aboutMe: req.body.aboutMe,
                personalQuote: req.body.personalQuote,
                practiceYears: req.body.practiceYears,
                attendedSchool: req.body.attendedSchool,
                graduatedYear: req.body.graduatedYear,
                howYouhearAboutUs: req.body.howYouhearAboutUs,
                fcmToken: req.body.fcmToken
              });
              // let mailTransport = nodemailer.createTransport({
              //   service : 'gmail',
              //   auth :{
              //     user : 'jfrandz85@gmail.com',
              //     pass : 'Jackson@123'
              //   }
              // });

              // let mailDetails = {
              //   from : 'jfrandz85@gmail.com',
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
                  res.send({ data });
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
          return res.status(500).send({ error: err, success: false  ,message: "DB error"});
        }
        if (!details) {
          return res.status(401).send({ error: err, success: false  ,message: "No counselor exist with this email"});
        }
  
        /* condition for compare password with counselor table data */
  
        if (!Helper.comparePassword(details.password, password)) {
          return res.send({data : {}, error: "Invalid Password" , success : false}).status(403);
        };
        details.fcmToken = req.body.fcmToken;
        details.save().then(doc => console.log("doument: ", doc));
        const token = Helper.generateToken(details._id);
        const data = {
          details,
          token
        }
        return res.status(200).send({ data: data,success : true, message: "Counselor login success" });
      })
    }
    catch (error) {
      res.status(500).send({ error: error.message });
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


// get intro message (text and video) for a counselor
module.exports.getIntroMessage = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.findOne({_id : userId}, {introMessage : 1, introVideo : 1})
    .then(doc =>{
      res.send({doc : doc, success : true, message : "introMessage fetched"});
    })  
    .catch(error =>{
      res.send({error, doc : {}, success : false, message : "DB error in introMessage fetch"});
    })
  } 
  catch (error) {
    res.send({error, doc : {}, success : false, message : "Unknown error"});  
  }
}

// upload document 

module.exports.uploadDocument = (req, res) =>{
  try {
    let fileSize = 1.5 * 1024 * 1024;
    const fileFilter = (req, file, cb) => {
      if (file.mimetype == 'application/pdf' || file.mimetype == 'application/msword'
      || file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') 
      {
        cb(null, true);
      }
      else {
        cb(new Error('only pdf/docx/doc files are allowed'));
      }
    }
    const upload = multer({
      storage : storage, 
      fileFilter : fileFilter,
    limits : {fileSize : fileSize}}).single('file');

    upload(req, res, (error) =>{
      console.log("req.body: ", req.file);
      if(error){
        res.send({error, success : false, message : "only pdf/doc/docx files are allowed"});
      }
      else{
        console.log(req.file);
        let {userId} = jwt.decode(req.params.token);
        Counselor.findOneAndUpdate({_id : userId}, {$push : {
          files : {
            url : req.file.filename,
            type : req.body.type
          }
        }}, {new : true})
        .then(data =>{
          res.send({data, success : true, message : "file upload success"});
        })
        .catch(error =>{
          res.send({error, success : false, message : "DB error : file data save error"});
        })
      }
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "error in file upload"});
  }
}


// get uploaded document for a counselor
module.exports.getDocument = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.findOne({_id : userId}, {files : 1})
    .then(doc =>{
      res.send({doc : doc.files, success : true, message : "document fetched"});
    })  
    .catch(error =>{
      res.send({error, success : false, message : "DB error in doc fetch"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "Unknown error"});  
  }
}




// delete document for a counselor
module.exports.deleteDocument = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    // console.log("userid: ", userId);
    let name = req.body.name;
    Counselor.updateOne({_id : userId},{
      $pull : {'files' : {url : name}}
    })
    .then(doc =>{
      res.send({doc, success : false, message : "doc deleted"});
    })  
    .catch(error =>{
      res.send({error, success : false, message : "DB error in doc deleted"});
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
            counselor.introVideo = "introMessage/" + req.file.filename;
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
      res.send({error, successc : false, message : "No counselor found"})
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}





// upload audio for different fields such as anxiety, depression

module.exports.uploadAudios = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    console.log("userId",userId);
    await Counselor.findById(userId)
    .then(counselor =>{
      console.log("counselor: ", counselor);
      try {
        const fileFilter = (req, file, cb) =>{
          if(file.mimetype == 'audio/mpeg' || file.mimetype == 'audio/mp3' || file.mimetype == 'audio/x-m4a'){
            cb(null, true)
          }
          else{
            return cb(new Error('only mp3 files are allowed'));
          }
        };
        const upload = multer({storage : storage, fileFilter : fileFilter}).single('file');
        upload(req, res, (error) =>{
          if(error){
            res.send({error, success : false, message : "only mp4 files are allowed"});
          }
          else{
            Counselor.findOneAndUpdate({_id : userId}, {$push : {
              audios : {
                id : new mongodb(),
                url : req.file.filename,
                type : req.body.type,
                name : req.body.name
              }
            }}, {new : true})
            .then(data =>{
              res.send({data, success : true, message : "file upload success"});
            })
            .catch(error =>{
              res.send({error, success : false, message : "DB error : file data save error"});
            })
          }
        })  
      } 
      catch (error) {
        res.send({error, successc : false, message : "file upload error"});
      }
    })
    .catch(error =>{
      res.send({error, successc : false, message : "No counselor found"})
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}


// delete audio file by category

module.exports.deleteAudio = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.updateOne({_id : userId},{
      $pull : {'audios' : {id : new mongodb(req.body.id)}}
    })
    .then(doc =>{
      res.send({doc, success : false, message : "doc deleted"});
    })  
    .catch(error =>{
      res.send({error, success : false, message : "DB error in doc deleted"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}





// get audios file uploaded by counselor

module.exports.getUploadedAudios = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.findOne({_id : userId}, {audios : 1, categories : 1})
    .then(doc =>{
      doc.audios = doc.audios.map(item =>{
        return { id : item.id, url : item.url, name : item.name,
          type : doc.categories.filter(a => a.id == item.type)[0].name}
      })
      res.send({doc : doc.audios, success : true, message : "document fetched"});
    })  
    .catch(error =>{
      res.send({error, doc : {}, success : false, message : "DB error in doc fetch"});
    })
  } 
  catch (error) {
    res.send({error, doc : {}, success : false, message : "Unknown error"});
  }
}


// get audios  by category
module.exports.getAudByCateg = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let id = req.body.id;
    console.log("id: ", id);
    Counselor.findOne({_id : userId}, {audios : 1})
    .then(doc =>{
      doc.audios = doc.audios.filter(item => item.type == id);
      res.send({doc : doc.audios, success : true, message : "document fetched"});
    })  
    .catch(error =>{
      res.send({error, doc : [], success : false, message : "DB error in doc fetch"});
    })
  } 
  catch (error) {
    res.send({error, doc : [], success : false, message : "Unknown error"});
  }
}


//send audios by category to user ( recorded audios)

module.exports.sendAudios = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let thread = await Chat.findOne({joinId : req.body.joinId}).sort({time : -1});
    // res.send({thread});
    if(thread){
      let chatData = new Chat({
        user_id : thread.user_id,
        username : thread.username,
        counsellor_id : thread.counsellor_id,
        counsellorname : thread.counsellorname,
        joinId : req.body.joinId,
        message : req.body.url, //https://api.kushubmedia.com/user/audios/1623306400228.mp3
        visible : false,
        role : 1,
        type : "audio",
        time : Date.now()
      });
      chatData.save()
      .then(data =>{
        res.send({data, success : true, message : "file send success"});
      })
      .catch(error =>{
        res.send({error, success : false, message : "file send error"});
      })
    } 
    else{
      res.send({data : [], success : false, message : "something went wrong. plz try again"});
    }
  } 
  catch (error) {
    res.send({error, doc : [], success : false, message : "Unknown error"});
  }
}


// add weekly availability
 
module.exports.addWeeklyAvailability = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token); // sepearting userid of counselor from  token
        // let userId = req.params.token;
    await Slot.deleteMany({ counselorId: userId })
      .then(result => {
        console.log("result", result);
      })
      .catch(error => {
        console.log("error: ", error);
      })

    // console.log("current date : ", new Date().getTimezoneOffset());
    const daysArray = req.body.daysArray;  // array of availability of days 

    const startTimeArray = req.body.startTimeArray; // start time array of days

    const endTimeArray = req.body.endTimeArray;     // end time array of days

    let finalArray = [];
    // inserting doc in db for each day    
    let i = 0;
    daysArray.forEach(async(day) => {
      let year = new Date().getUTCFullYear();
      let month = new Date().getUTCMonth();
      let currentDate = new Date().getUTCDate();

      startTimeArray[i][`${day}`] = startTimeArray[i][`${day}`].length == 7 ? "0"+startTimeArray[i][`${day}`]
       : startTimeArray[i][`${day}`];

      let startTime = new Date().toISOString().substring(0, 10) + ":" + startTimeArray[i][`${day}`]; // start time for a day


      let date = new Date(startTime);
      
      // do sloting here
      let slot = [];
      let timeSlot = [];
      let j = 0;
      let compareTime = date.getTime();
      // console.log("compare time: ", compareTime);
      endTimeArray[i][`${day}`] = endTimeArray[i][`${day}`].length == 7 ? "0"+endTimeArray[i][`${day}`] : 
      endTimeArray[i][`${day}`];
      console.log("endtime array[i]: ", endTimeArray[i][`${day}`].substring(0,2));
      // now what you need to do is change 12 hours in 24 hours so that slot can be created
      // this will save all this in local time
      // and when u fetch convert it or do sloting after conversion to gmt or utc
      
      // console.log("end time array[i]: ",endTimeArray[i]);
      
      let endTime = new Date(new Date().toISOString().substring(0, 10) + " " + endTimeArray[i][`${day}`]); // end time for a day
      
      // let endTime = Date.UTC(`${year}`, `${month}`, `${currentDate}`,
      // `${endTimeArray[i].substring(0,2)}`,`${endTimeArray[i].substring(3,5)}`, `00`);
      // console.log("end time : ",endTime);
      // making slots for a day
      while (endTime.getTime() >= compareTime) {
        slot[j] = date.setUTCMinutes(date.getUTCMinutes() + 30);
        console.log("slot[j]: ", slot[j]);
        // formatting unix time_stamp to date_time 
        let dt = new Date(compareTime);
        compareTime = slot[j];
        console.log("dt: ", dt);
        let time = dt.getUTCHours() + ':' + dt.getUTCMinutes();
        timeSlot[j] = time;
        j++;
      }
      console.log("timeslot: ", timeSlot);
      finalArray[i] = {
        day: day,
        status: 'active',
        slot: timeSlot.map((time, index, array) => {
          // console.log("time: ", new Date(time));
          if (array[index + 1] !== undefined) return { status: 0, time: time + "-" + array[index + 1] };
        })
          .filter((time) => {
            return time !== undefined;
          })
      }

      i++;
    });

    const slotDB = new Slot({
      counselorId: userId,
      availability: finalArray
    });
    await slotDB.save()
      .then(async (response) => {

        // res.send({response});

        const availability = response.availability
        // console.log("availibulity: ", availability);
        // res.send({availability});
        let startDate = new Date();
        let endDate = new Date();
        endDate.setUTCMonth(endDate.getUTCMonth()+1);
        // console.log("start date: ", startDate, " ", endDate);

        const days = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let arrayOfUpcoming = [];
        for(let i = startDate, k=0; i<= endDate; i.setDate(i.getDate()+1)){
          // console.log("date is: ",i.toLocaleDateString() ,days[i.getDay()]);
          // console.log("availability: ", availability.length," ",k);
          let newSlots = [];
          for(let j = 0; j < availability.length; j++){
            // console.log("available day: ", j);
            let year = i.getUTCFullYear();
            let month = i.getUTCMonth();
            let currentDate = i.getUTCDate();
            
            // console.log("availability[j]: ", availability[j], " ",j);
            newSlots[j] = availability[j].slot.map(data =>{
              // console.log("data: ", data);
              let timeString = data.time.split('-');
              let formattedTime1 = timeString[0].split(':');
              // console.log("time string: ", timeString, "formattedTime: ", formattedTime1);
              let time1 = formattedTime1[0].length == 1 ? "0"+formattedTime1[0] : formattedTime1[0];
              let time2 = formattedTime1[1].length == 1 ? "0"+formattedTime1[1] : formattedTime1[1];
              let formattedTime2 = timeString[1].split(':');
              // console.log("time string: ", timeString, "formattedTime: ", formattedTime1);
              let time3 = formattedTime2[0].length == 1 ? "0"+formattedTime2[0] : formattedTime2[0];
              let time4 = formattedTime2[1].length == 1 ? "0"+formattedTime2[1] : formattedTime2[1];
              // console.log(year, month, currentDate, time1, time2, time3, time4);
              t1 = Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time1}`,`${time2}`, `00`)/1000;
              t2 = Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time3}`,`${time4}`, `00`)/1000;
              // console.log(Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time1}`,`${time2}`, `00`)/1000);
              // console.log(Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time3}`,`${time4}`, `00`)/1000);

              return {status : data.status, time : t1+"-"+t2}  
            })
            // res.send({newSlots})
            if(days[i.getDay()] === availability[j].day){
              // console.log("i.toDateString(),: ", i.toUTCString());
              arrayOfUpcoming[k] = {
                day : availability[j].day,
                date : i.toUTCString().substring(0,16),
                status : 'active',
                slot : newSlots[j]
              }
              k++;
            }
          }
        }
        
        // console.log(arrayOfUpcoming);
        UpcomingSlots.deleteMany({counselorId : userId})
        .then(doc =>{
          console.log("old one deleted");
        })
        .catch(error =>{
          console.log("error in old deletion");
        })
        const upcomingSlot = new UpcomingSlots({
          counselorId : userId,
          availability : arrayOfUpcoming
        });
        await upcomingSlot.save()
        .then(doc =>{
          // doc.availability = doc.availability.map(slots =>{

          //   let dataArray = slots.slot.map(data =>{
          //     return {time : data.time, status : data.status}
          //   })
  
          //   console.log(" slots.slot", slots.day);
          //   return {day : slots.day, date: slots.date ,dataArray}
          // })
          res.send({data: doc, success: true, message: "data saved" });
        })
        .catch(error =>{
          console.log("error in data save: ", error);
          res.send({error});
        })
      })
      .catch(error => {
        console.log("error in slot data save", error);
        res.send({ error: error, success: false, message: "error at sloting" });
      })
  }
  catch (error) {
    console.log("error in last catch: ", error);
    res.send({ error: error, message: "something gone wrong while scheduling" });
  }
}




module.exports.filterByDate = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;

    let startDate = new Date(req.body.startDate);
    let endDate = new Date(req.body.endDate);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weekAvailability = await Slot.findOne({ counselorId: userId });
    // console.log("weekly availability: ", weekAvailability);
    const availability = weekAvailability.availability;

    if (!weekAvailability) {
      res.send({ data: {}, success: false, message: "You need to set your weekly availability" });
    }
    else {
      if (startDate.toLocaleDateString() == endDate.toLocaleDateString()) {
        await UpcomingSlots.find({counselorId : userId })
          .then(data => {
            data[0].availability = data[0].availability.filter(slot =>{
              // console.log(new Date(slot.date).toLocaleDateString(), "     ", new Date().toLocaleDateString());
              return new Date(slot.date).toLocaleDateString() === startDate.toLocaleDateString();
            })
            res.send({ data:  data[0].availability, success: true, message: "slot fetched" });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error: for same date" });
          })
      }
      else {

        let arrayOfUpcoming = [];
        for(let i = startDate, k=0; i<= endDate; i.setDate(i.getDate()+1)){
          // console.log("inside for loop date is: ",i.toLocaleDateString() ,days[i.getDay()]);
          // console.log("availability: ", availability.length," ",k);
          let newSlots = [];
          for(let j = 0; j < availability.length; j++){
            // console.log("available day: ", j);
            let year = i.getUTCFullYear();
            let month = i.getUTCMonth();
            let currentDate = i.getUTCDate();
            
            
            newSlots[j] = availability[j].slot.map(data =>{
              
              let timeString = data.time.split('-');
              let formattedTime1 = timeString[0].split(':');
              
              let time1 = formattedTime1[0].length == 1 ? "0"+formattedTime1[0] : formattedTime1[0];
              let time2 = formattedTime1[1].length == 1 ? "0"+formattedTime1[1] : formattedTime1[1];
              let formattedTime2 = timeString[1].split(':');
              
              let time3 = formattedTime2[0].length == 1 ? "0"+formattedTime2[0] : formattedTime2[0];
              let time4 = formattedTime2[1].length == 1 ? "0"+formattedTime2[1] : formattedTime2[1];
              
              t1 = Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time1}`,`${time2}`, `00`)/1000;
              t2 = Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time3}`,`${time4}`, `00`)/1000;
              
              // console.log(Date.UTC(`${year}`, `${month}`, `${currentDate}`,`${time3}`,`${time4}`, `00`)/1000);
              
              
              return {status : data.status, time : t1+"-"+t2}  
            })
            
            if(days[i.getDay()] === availability[j].day){
              
              arrayOfUpcoming[k] = {
                day : availability[j].day,
                date : i.toDateString().substring(0,16),
                status : 'active',
                slot : newSlots[j]
              }
              k++;
            }
          }
        }
        let a = req.body.startDate.split("/");
        let b = req.body.endDate.split("/");
        // console.log("startDte: ", a[0]+"-"+a[1]+"-"+a[2]);
        //2021-06-22
        // let date1 = new Date(a[0]+"-"+a[1]+"-"+a[2]).toISOString().substring(0,10);
        let date1 = new Date(req.body.startDate).toISOString().substring(0,10);
        // let date2 = new Date(b[0]+"-"+b[1]+"-"+b[2]).toISOString().substring(0,10);
        let date2 = new Date(req.body.endDate).toISOString().substring(0,10);
        console.log("date: ", date1, " ", date2);
        CounselorToUser.aggregate([
          { "$match": {"counselorId" : userId} },
          { "$match": { "date": { $gte: date1 } } },
          { "$match": { "date": { $lte: date2 } } },
          { "$unwind": "$slots" },
          { "$match": {"slots.status" : 3} }
        ])
        .then(doc =>{
          // console.log("doc: ", doc);
          arrayOfUpcoming = arrayOfUpcoming.map(item =>{
              item.slot = item.slot.map(data =>{
                // console.log("data: ", data);
                let index = doc.findIndex(item => {
                  // console.log("item: ", item);
                  return item.slots.time == data.time
                });
                console.log("index: ", index);
                return { time : data.time, status : index == -1 ? data.status : 3}
              })
              return {day : item.day, date : item.date, status : item.status, slot : item.slot} ;
          })
          res.send({doc : arrayOfUpcoming, data: doc, success : true, message : "data fetch"});
        })
        .catch(error =>{
          res.send({error, success : false, message : "db error for booking fetch"});
        })
      }
    }

  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error: filter by date" });
  }
}


// get upcoming slot from today onwards

module.exports.getUpcomingSlots = async (req,res)=>{
  try {
    let { userId } = jwt.decode(req.params.token);
    console.log("userid: ", userId);
    let date = new Date(req.body.date).toUTCString().substring(0, 16);
    
    // await UpcomingSlots.findOne({counselorId : userId})
    const slots = await UpcomingSlots.aggregate([
      { "$match": { "counselorId": userId} },
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
    ])
    if (!slots || slots.length == 0) {
      res.send({ response: {}, success: false, message: "no active slot found for this date/counsellor" });
    }
    else {
      slots[0].date = date;
      slots[0].status = "active";
      slots[0].day = new Date(req.body.date).getDay();
      res.send({ response: slots, success: true, message: "slots fetched" });
    }
  } 
  catch (error) {
   res.send({error, success : false, message : "error in upcoming slot fetch"});
  }
}




// get slots for a week

module.exports.getSlotForAWeek = async (req,res)=>{
  try {
    let { userId } = jwt.decode(req.params.token);
    let counselor = await Counselor.findById(userId, {timezone : 1});
    // console.log("counselor: ", counselor.timezone);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat","Sun"];
    let workingHours = await Slot.findOne({counselorId: userId});
    // console.log("working hours: ", workingHours);
    if(!workingHours || workingHours.availability.length == 0){
      // console.log("in if");
      let defaultData = []
      for(let i=0; i<days.length; i++){
          let data =  {
            day : days[i],
            status : "inactive",
            startTime : 0,
            endTime : 0,
          }
          // console.log("data: ", typeof workingHours);
          defaultData.push(data);
      }
      return res.send({workingHours : defaultData, success : true, message : "you need to set your working hours"});
    }
    let year = new Date().getUTCFullYear();
    let month = new Date().getUTCMonth();
    let currentDate = new Date().getUTCDate();
    
    workingHours.availability = workingHours.availability.map(item =>{
      let length = item.slot.length;
      // console.log("item.slot[0].time.spli: ", item.slot[0].time.split("-")[0].split(":")[0]);

      let timeStamp1 = new Date(Date.UTC(`${year}`, `${month}`, `${currentDate}`,
      `${item.slot[0].time.split("-")[0].split(":")[0]}`,
      `${item.slot[0].time.split("-")[0].split(":")[1]}`, `00`)).toLocaleTimeString();
      // console.log("time stamp1: ", timeStamp1.split(":"));
      let timeStamp2 = new Date(Date.UTC(`${year}`, `${month}`, `${currentDate}`,
      `${item.slot[length-1].time.split("-")[1].split(":")[0]}`,
      `${item.slot[length-1].time.split("-")[1].split(":")[1]}`, `00`)).toLocaleTimeString();
      // console.log("time stamp1: ", timeStamp2.split(":"));
      let splited1 = timeStamp1.split(":");
      let splited2 = timeStamp2.split(":");

      // console.log(splited1, " ",splited2);

      return { day : item.day, status : item.status,
      startTime : splited1[0]+":"+splited1[1]+" "+splited1[2].substring(3,5), 
      endTime : splited2[0]+":"+splited2[1]+" "+splited2[2].substring(3,5)}
    })
    
    for(let i=0; i<days.length; i++){
      let index = workingHours.availability.findIndex(item => item.day == days[i])
      if(index == -1){
        let data =  {
          day : days[i],
          status : "inactive",
          startTime : 0,
          endTime : 0,
        }
        workingHours.availability.splice(i, 0, data);
      }
    }
    // console.log("working: ", workingHours)
    await UpcomingSlots.findOne({counselorId : userId})
    .then(doc =>{
      let data = [];
      // console.log("doc: ", doc);
      if(!doc || doc.availability.length == 0){
        data = []
      }
      else{
        data = doc.availability.filter(slot =>{
          return new Date(slot.date).toLocaleDateString() >= new Date().toLocaleDateString();
        })

        data = data.map(slots =>{
          // console.log(new Date(slots.date).toLocaleDateString());
          return { day : slots.day, date : new Date(slots.date).toLocaleDateString(),
          status : slots.status , slot : slots.slot}
        })
      }
      res.send({
        data : data.slice(0,7), 
        workingHours : workingHours.availability,
        startDate : data.slice(0,7)[0].date,
        endDate : data.slice(0,7)[data.slice(0,7).length-1].date,
        timezone : counselor.timezone ? counselor.timezone : "", 
        success : true, 
        message : "slot fetched from today onwards"
      });
    })
    .catch(error =>{
      res.send({
      	error, 
      	workingHours : defaultData, 
      	data : [],  
      	success : true, // error me bhi success true saurabh sir ke kehne par
      	message : "DB error: upcoming slot fetch"
      });
    })
  } 
  catch (error) {
    res.send({error, workingHours : defaultData, data : [], success : true, message : "error in upcoming slot fetch"});
  }
}





// get all upcoming booking from today onwards

module.exports.forCalendar = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let ids = [];
    let docs = [];
    (await CounselorToUser.find({counselorId : userId}))
    .forEach(item =>{
      ids.push(item.userId);
      docs.push(item);
    })
    if(docs.length <= 0 || ids.length <= 0){
      return res.send({data : [], success : false, message : "No booking found"});
    }
    
    let allUser = await userModel.find({}, {username : 1}).where('_id').in(ids);
    
    if(allUser.length <= 0) return res.send({data : [], success : false, message : "DB error"});
    
    let data = [];
    let m = 0;
    let k = 0;
    console.log(docs.length)
    while(m < docs.length){
      // let index = allUser.findIndex(item => item._id == docs[m].userId);
      // console.log("index: ", index);
      for(let j =0; j<docs[m].slots.length; j++){
        data[k] = {
          _id : docs[m]._id,
          // name :  allUser[index].username,
          name :  allUser[allUser.findIndex(item => item._id == docs[m].userId)].username,
          date : docs[m].date,
          slot : docs[m].slots[j]
        }
        k++;
      }
      m++;
    }
    res.send({data , success : true, message : "All slot fetch for a user"});
    // let data = [];
    // CounselorToUser.find({counselorId : userId})
    // .then(async doc =>{

    //   console.log(doc.length);
    //   let i = 0;
    //   let n=0;
    //   while(i<doc.length){
    //     console.log(i)
    //     await userModel.findById(doc[i].userId)
    //     .then(async user =>{
    //       console.log("user: ", user.username, doc[i].slots.length);
    //       for(let j =0; j<doc[i].slots.length; j++){
    //         data[n] = {
    //           _id : doc[i]._id,
    //           name :  user.username,
    //           date : doc[i].date,
    //           slot : doc[i].slots[j]
    //         }
    //         n++;
    //       }
          
    //     })
    //     .catch(error =>{
    //       res.send({error, success : false, message : "user details fetch error"});
    //     })
    //     i++;
    //   }
    //   // console.log(data.length)
    //   res.send({data , success : true, message : "All slot fetch for a user"});
    // })
    // .catch(error =>{
    //   res.send({error, success : false, message : "DB error: for all slot fetch"});
    // })
  }
   catch (error) {
    res.send({error : error, success : false, message : "Invalid request : something is wrong with request"});
  }
}


// get counselor's plan of today

module.exports.todayPlan = async (req, res) =>{
  try {
    let { userId }  = jwt.decode(req.params.token);
    // let userId = req.params.token;
    let date = new Date().toISOString().substring(0,10);
    console.log("date: ", date);
    let data = [];
    await CounselorToUser.find({$and : [{counselorId : userId}, {date : date}]})
    .then(async doc =>{
      if(doc.length == 0){
        res.send({data : doc, success : false, message : 'no data found'});
      }
      else{
        for(let i =0; i<doc.length; i++){
          await userModel.findById(doc[i].userId)
          .then(user =>{
            // console.log("user: ", user);
            data[i] = {
              name : user.username,
              date : doc[i].date,
              slots : doc[i].slots
            }
          })
        }
        res.send({data, success : true, message : 'plan fetch for today'});
      }
    })
    .catch(error =>{
      res.send({error, success : false, message : 'DB error: today plan fetch error'});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : 'unknown error'});
  }
}




// disable particular slots for a/multiple date
module.exports.disableSlotsByTime = async (req, res) => {
  try {
    const date = new Date(req.body.date).toString().substring(0, 15).split(" ");
    let dt = date[0]+", "+date[2]+" "+date[1]+" "+date[3];
    //  Tue, 17 May 2021
    const timeSlot = req.body.slot;
    let { userId } = jwt.decode(req.params.token);
    console.log("userid: ", date, dt.length);
    await UpcomingSlots.find({ counselorId: userId })
      .then(async (doc) => {
        let status;
        doc[0].availability = await doc[0].availability.filter(doc => {
          console.log("doc.date: ", doc.date, " ", dt);
          return doc.date === dt;
        });
        console.log("doc[0]: ", doc[0].availability);
        status = await doc[0].availability[0].slot.filter(slots => {
          return slots.time === timeSlot;
        })
        console.log("status: ", status[0].status);
        await UpcomingSlots.updateOne({ counselorId: userId },
          { $set: { 'availability.$[a].slot.$[s].status': status[0].status === 0 ? 1 : 0 } },
          { arrayFilters: [{ 'a.date': dt }, { 's.time': timeSlot }] })
          .then(updatedDoc => {
            res.send({ data: updatedDoc, success: true, message: 'slot disabled' });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error: in slot disable" });
          })
      })
  }
  catch (error) {
    res.send({ error: error, success: false, message: "Invalid request : something is wrong with request" });
  }
}



// disable slots for an entire day

module.exports.disableSlotsByDate = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    // let date = new Date(req.body.date).toUTCString().substring(0, 16);
    let date = req.body.date.split("/");
    let newDate = Date.UTC(date[0], date[1]-1, date[2]);
    let dt = new Date(newDate).toUTCString().substring(0, 16);
    console.log("date is: ", newDate, " userId: ", dt);
    await UpcomingSlots.find({ counselorId: userId })
      .then(async doc => {
        doc[0].availability = await doc[0].availability.filter(doc => {
          return doc.date === dt;
        });
        console.log(doc[0].availability[0]);
        await UpcomingSlots.findOneAndUpdate(
          { counselorId: userId, "availability.date": dt },
          { $set: 
            { "availability.$.status": doc[0].availability[0].status ==='active' ? 'inactive' : 'active', 
          "availability.$.slot.$[].status" : doc[0].availability[0].status ==='active' ? 1 : 0 },
          },
          { new: true }
        )
          .then(doc => {
            res.send({ doc : doc.availability, success: true, message: "slot disable for specified date" });
          })
          .catch(error => {
            res.send({ error, success: false, message: "DB error: in slot disable for a date" });
          })
      })
  }
  catch (error) {
    res.send({ error: error, success: false, message: "Invalid request or incorrect token" });
  }
}


// book a session for a user fron counselor side

module.exports.bookSession = (req, res) => {
  try {
    let counselorId = jwt.decode(req.params.token).userId;
    let date = new Date(req.body.date).toUTCString().substring(0, 16);
    let { userId, time } = req.body;
    console.log("date is: ", date);
    CounselorToUser.findOne({ counselorId: counselorId, userId: userId, date: req.body.date })
      .then(doc => {
        if (doc != null) {
          // res.send({doc});
          let index = doc.slots.findIndex(slot => slot.time == time);
          console.log("index: ", index);
          if (index == -1) {
            let newSlot = {
              time: time,
              status: 3
            }
            doc.slots.push(newSlot);
            // res.send({ doc });
            CounselorToUser.updateOne({ _id: doc._id }, doc)
              .then(bookedSession => {
                res.send({data : bookedSession, success : true, message : "booking confirmed"});
                UpcomingSlots.updateOne({ counselorId: counselorId },
                  { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                  { arrayFilters: [{ 'a.date': date }, { 's.time': time }] })
                  .then(result => {
                    console.log(result);
                  });
                  
              })
              .catch(error => {
                res.send({error, data : {}, success : false, message : "booking data save error"});
              })
          }

          else {
            for (let i = 0; i < doc.slots.length; i++) {
              if (doc.slots[i].time == time) {
                doc.slots[i].status = 3;
              }
            }
            CounselorToUser.updateOne({ _id: doc._id }, doc)
              .then(bookedSession => {
                res.send({data : bookedSession, success : true, message : "booking confirmed"});
                UpcomingSlots.updateOne({ counselorId: counselorId },
                  { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                  { arrayFilters: [{ 'a.date': date }, { 's.time': time }] })
                  .then(result => {
                    console.log(result);
                  });
                  
              })
              .catch(error => {
                res.send({error, data : {}, success : false, message : "booking data save error"});
              })
          }
        }
        else {
          // console.log("slot: in else ", slot)
          let newSlot = {
            time: time,
            status: 3
          }
          let sessionData = new CounselorToUser({
            counselorId: counselorId,
            userId: userId,
            date: req.body.date,
            slots: [newSlot]
          });
          sessionData.save()
            .then(bookedSession => {
              res.send({data : bookedSession, success : true, message : "booking confirmed"});
              UpcomingSlots.updateOne({ counselorId: counselorId },
                { $set: { 'availability.$[a].slot.$[s].status': 3 } },
                { arrayFilters: [{ 'a.date': date }, { 's.time': time }] })
                .then(result => {
                  console.log(result);
                });
                
            })
            .catch(error => {
              res.send({error, data : {}, success : false, message : "booking data save error"});
            })
        }
      })
      .catch(error => {
        res.send({error, data : {}, success : false, message : "session data save error"});
      })
  }
  catch (error) {
    res.send({error, data:  {}, success : false, message : "unknown error"});
  }
}



// Potential functionality

module.exports.potential = (req, res) =>{
  try {
    Chat.find({counsellor_id : "5fc9cb88db493e26f44e9622"})
    .then(docs =>{
      console.log("docs: ", docs.length);
      docs =  _.uniqBy(docs, 'user_id');
      let potential = [];
      for(let i=0; i< docs.length; i++){
        // console.log("docs[i] : ",docs[i]);
        potential[i] = {
          userName : docs[i].username,
          userImage : docs[i].user_image,
          userId : docs[i].user_id
 
        }
      }
      res.send({potential, success : false , message : "potential fetched"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : 'unknown error: might be db error'});
  }
}



// counselor inbox

module.exports.inbox = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    let {page, limit} = req.body;

    let skipIndex = (page-1)*limit
    // let userId = req.params.token;

    let userdata = await userModel.find({ counselorId: userId , status : {$exists : true}},
      { lastMessage: 1, messageCount: 1, status: 1, profilePhoto: 1 })
      .sort({"lastMessage.time" : -1})
      .limit(limit)
      .skip(skipIndex)
      .exec();

    let trial = 0, active = 0, inactive = 0;

    console.log("userdata.length: ", userdata.length);

    userdata.forEach(item =>{
      if(item.status == 'active'){active = active+1; item.lastMessage.sortBy = 'a'}
      if(item.status == 'inactive') {inactive = inactive+1; item.lastMessage.sortBy = 'u'}
      if(item.status == 'trial') {trial = trial+1; item.lastMessage.sortBy = 't'}
    })

    userdata = _.sortBy(userdata, 'lastMessage.visible', 'lastMessage.sortBy');

    let data = { all: trial + active + inactive, trial, active, inactive, array: userdata }

    res.json(data).status(200);
  }
  catch (error) {
    res.status(501).send({ error, success: false, message: "unknown error" });
  }
}



// get draft list of counsellor

module.exports.getDraftList = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Chat.find({counsellor_id : userId, draftrole : "1", message : {$ne : ""}})
    .then(async draft =>{
      if(!draft || draft.length == 0){
        return res.send({data : {}, success : false, message : "no draft found"});
      }
      else{
        console.log(draft);
        for(let i=0; i<draft.length;i++){
          draft[i] = draft[i].toJSON();
          if(draft[i].user_id){
            let user = await userModel.findById(draft[i].user_id);
            draft[i].status = user.status;
          }
        }
        res.send({draft, success : true, message : "draft list fetched"});
      }
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error in draft fetch"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}



// send saved draft as message 

module.exports.sendDraft = (req, res) => {
  try {
    // let { userId } = jwt.decode(req.params.token);
    let id = req.body.id;
    Chat.findById(id)
      .then(draft => {
        if (!draft) {
          res.send({ data: {}, success: false, message: "no draft found with such id" });
        }
        else {
          chatData = new Chat({
            user_id: draft.user_id,
            username: draft.username,
            counsellor_id: draft.counsellor_id,
            counsellorname: draft.counsellorname,
            joinId: draft.joinId,
            visible : false,
            message: draft.message,
            type: "text",
            role: draft.role,
            time: new Date()
          })
          chatData.save()
            .then(chat => {
              const newDraft = {
                message: "",
                time: new Date()
              }
              Chat.updateOne({_id : id}, newDraft, {upsert : true})
              .then(response =>{
                console.log("response: ", response);
                res.send({chat , success : true, message : "message send"});
              })
              .catch(error =>{
                res.send({error, success : false, message : "DB error : draft update"});
              })
            })
            .catch(error => {
              res.send({ error, success: false, message: "DB error: chat data save" });
            })
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "db error in draft found" })
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error" });
  }
}






// take action against message 

module.exports.action = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    userModel.updateOne({username : req.body.id}, 
      {$set : {"lastMessage.visible" : req.body.status == 0 ? false: true}})
    .then(doc =>{
      res.send({doc, success : true, message : "message status updated"});
    })
    .catch(error =>{
      res.send({error, success : false,  message : "DB error in status update"});
    })
    // if (req.body.status == 0) {
    //   Chat.findOne({ username: req.body.id, role: "0" }).sort({ time: -1 })
    //     .then(chat => {
    //       Chat.updateOne({ _id: chat._id }, { $set: { visible: false } })
    //         .then(doc => {
    //           console.log("doc: ", doc);
    //           res.send({ success: true, message: "thread status updated" });
    //         })
    //         .catch(error => {
    //           res.send({ error, success: false, message: "DB error : thread status update" });
    //         })
    //     })
    //     .catch(error => {
    //       res.send({ error, success: false, message: "DB error: thread status update" });
    //     })
    // }
    // else {
    //   Chat.updateMany({ username: req.body.id, role: "0" }, { $set: { visible: true } },
    //     { new: true })
    //     .then(chat => {
    //       res.send({ success: true, message: "message status updated" });
    //     })
    //     .catch(error => {
    //       res.send({ error, success: false, message: "DB error: message status update" });
    //     })
    // }
  }
  catch (error) {
    res.send({ error, success: false, message: "Unknown error" });
  }
}



// get count of potential and text messages

module.exports.getCount = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let date = new Date().toISOString().substring(0, 10);
    console.log("date : ", date);
    Chat.find({counsellor_id : "5fc9cb88db493e26f44e9622"})
    .then(async potential =>{
      // potential =  _.uniqBy(potential, 'user_id');
      let key = 'user_id';
      potential = [...new Map(potential.map(item =>
            [item[key], item])).values()];
      potential = potential.length;
      Chat.find({counsellor_id : userId, visible : false, role : "0", type : {$ne : "draft"}})
      .then(async unreadMessage =>{
        console.log("unread message: ", unreadMessage);
        // unreadMessage =  _.uniqBy(unreadMessage, 'user_id');
        unreadMessage = [...new Map(unreadMessage.map(item =>
            [item[key], item])).values()];
        unreadMessage = unreadMessage.length;
        Chat.find({counsellor_id : userId, draftrole : "1",message : {$ne : ""}}).countDocuments()
        .then(draft =>{
          CounselorToUser.aggregate([
            { "$match": { "counselorId": userId } },
            { "$match": { "date": { $gte: date } } },
            { "$unwind": "$slots" },
            { "$match": {"slots.status" : {"$in" : [0,3]}} }
          ])
          .then(sehedule =>{
            console.log("sehduel: ", sehedule);
            res.send({potential, unreadMessage, draft,sehedule : sehedule.length });
          })
          
        })
        .catch(error =>{
          res.send({error, success : false, message : "draft count fetch error"});
        })
      })
      .catch(error =>{
        res.send({error, success : false, message : "DB error : in chat find"});
      })
    })
    .catch(error =>{
      res.send({error, success : false, message  : "potential find error"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message  : "unknown error in count fetch"});
  }
}




// accept a user

module.exports.userAssignment = async (req, res) => {
  try {
    let counselorId = jwt.decode(req.params.token).userId;
    let counselorData = await Counselor.findById(counselorId);
    if(counselorData.status == 'inactive'){
      return res.send({status: counselorData.status, success : false, message : "your application is pending to review"});
    }
    
    let userId = req.body.userId
    Chat.deleteMany({user_id : userId})
    .then(deleted =>{
      console.log("old chat deleted: ", deleted);
    })
    .catch(error =>{
      console.log("db error in old chat deletion: ", error);
    })
    console.log("counselor: ", counselorId, " userId: ", userId);
    let userData = await userModel.findById(userId);
    console.log("counselorData: ", counselorData);
    let threadData = new Chat(
      {
        counsellor_id: counselorId,
        counsellorname: counselorData.userName,
        username : userData.username,
        joinId: userId + "-" + counselorId,
        message: counselorData.introMessage ? counselorData.introMessage : "",
        type : "text",
        visible : false,
        role : 1,
        user_id : userId,
        time : Date.now()
      }
    )
    let videoData = new Chat({
      counsellor_id: counselorId,
      counsellorname: counselorData.userName,
      username : userData.username,
      joinId: userId + "-" + counselorId,
      message: counselorData.introVideo ? counselorData.introVideo : "",
      type : "video",
      visible : false,
      role : 1,
      user_id : userId,
      time : Date.now()
    })
    videoData.save()
     .then(document =>{
       console.log("intro video send to user: ", document);
   })
    await threadData.save()
      .then(chat => {
        console.log("chat : ", chat);
        let joinId = userId + "-" + counselorId;
        let userData = {
          joinId : joinId,
          counselorId : counselorId,
          lastMessage : chat
        }
        res.send({ thread: chat, joinId, success: true, message: "counselor assing to user" });

        userModel.updateOne({_id : userId}, userData)
        .then(userDetails =>{
          console.log("joinid and counselor id saved in user model: ", userDetails);
        })
        let paymentData = new CounselorPayment({
          counselorId : counselorId,
          userId  : userId,
          counsellorname : counselorData.userName,
          username : userData.username
        })
        paymentData.save()
        .then(doc =>{
          console.log("data saved in counselor payment table");
        })
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error : thread data save error" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "something goes wrong in counselor assignment" });
  }
}


// get messages for a user

module.exports.getUpcomingSessionsForaUser = async (req, res) => {
  try {
    let counselorId = jwt.decode(req.params.token).userId;
    let userId = req.body.userId;
    let user = await userModel.findById(userId, {profilePhoto : 1});
    // let date = new Date().toISOString().substring(0, 10);
    // console.log("counsleor id: ", counselorId, " userId: ", userId, " date is : ", date);
    // CounselorToUser.find({ userId: userId, counselorId: counselorId})
    CounselorToUser.aggregate([
      { "$match": { "userId": userId , "counselorId" : counselorId} },
      // { "$match": { "date": { $gte: date } } },
      { "$unwind": "$slots" },
      { "$match": {"slots.status" : {"$in" : [0,3]}} }
    ])
      .then(doc => {
        if (doc.length == 0) {
          res.send({upcomingSessions : {}, success : false, message : "no booking found"});
        }
        else {
          // let upcomingSessions = [];
          // upcomingSessions[0] = doc[0];
          // console.log("upcoming sessions: ", upcomingSessions);
          res.send({ upcomingSessions : doc,photo : user.profilePhoto, success: true, message: "you got your upcoming sessions for this user" });
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
      { "$match": { "counselorId": userId } },
      { "$match": { "userId": req.body.user_id } },
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




// cancel a session of a particular user
module.exports.cancelSession = async (req, res) =>{
  try {
    // let counselorId = jwt.decode(req.params.token).userId;
    let time = req.body.time;
    let slotId = req.body.id;
    let slotData = await CounselorToUser.findOne({_id : slotId});
    let date1 = new Date(slotData.date).toUTCString().substring(0, 16);
    CounselorToUser.updateOne({_id : slotId, "slots.time" : time}, 
      {$set : {"slots.$.status" : 0}}, {new : true}
      )
      .then(doc =>{
        console.log("doc: ", doc);
        UpcomingSlots.updateOne({ counselorId: slotData.counselorId },
          { $set: { 'availability.$[a].slot.$[s].status': 0 } },
          { arrayFilters: [{ 'a.date': date1 }, { 's.time': time }] })
          .then(result => {
            console.log("slot marked as active: ",result);
          });
        res.send({doc, success : true, message : "session canceled"});
      })
      .catch(error =>{
        res.send({error, success : false, message : "DB error: session cancel from counselor side"});
      })
  } 
  catch (error) {
    res.send({error, success : true, message : "unknown error"});
  }
}


// forgot password functionality

module.exports.forgotPassword = (req, res) => {
  try {
    const email = req.body.email;
    Counselor.findOne({ email: email }, async (error, doc) => {
      if (error || !doc) {
        res.send({ error: error, success: false, message: 'DB error: no counselor exists' });
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
          to: 'edwy23@gmail.com',
          subject: 'Test mail',
          text: otp.toString()
        }
        console.log(" maildetails: ", mailDetails);
        mailTransport.sendMail(mailDetails, async (error, response)=>{
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



// change password

module.exports.changePassword = (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      res.send({data : {}, error: 'mismatch confirm password with new password', success : false }).status(301);
    }
    else {
      let { userId } = jwt.decode(req.params.token);
      Counselor.findById(userId, (error, counselor) => {
        if (error) {
          res.send({data : {}, error: error.message, success : false, message: 'DB error in Reset Password' });
        }
        if (!counselor) {
          res.send({data : {}, error: error, success : false, message: 'No counselor found with such id'}).status(302);
        }
        else {
          let { password } = counselor;

          if (!Helper.comparePassword(password, currentPassword)) {
            return res.send({data : {}, error: "Incorrect current password", success : false }).status(303);
          }

          else{
            counselor.password = Helper.hashPassword(newPassword);
            counselor.save((error,doc)=>{
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




//edit profile section

module.exports.editProfile = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
      // console.log("userid: ", userId);
      Counselor.findById(userId)
        .then(counselor => {
          if(!counselor) return res.send({success : false, message  : "no counselor found: DB error"});
          
          else{
            let counselorData = {
              nickName: req.body.nickName ? req.body.nickName : counselor.nickName,
              aboutMe: req.body.aboutMe ? req.body.aboutMe : counselor.aboutMe,
              practiceYears: req.body.practiceYears ? req.body.practiceYears : counselor.practiceYears,
              attendedSchool: req.body.attendedSchool ? req.body.attendedSchool : counselor.attendedSchool,
              graduatedYear: req.body.graduatedYear ? req.body.graduatedYear : counselor.graduatedYear,
              licenseNumber: req.body.licenseNumber ? req.body.licenseNumber : counselor.licenseNumber,
              state: req.body.state ? req.body.state : "",
              specialities: req.body.specialities ? req.body.specialities : counselor.specialities,
              designations: req.body.designations ? req.body.designations : counselor.designations,
            }
            Counselor.updateOne({ _id: userId }, counselorData, { upsert: true })
              .then(doc => {
                res.send({ data: doc, success: true, message: "details updated" });
              })
              .catch(error => {
                res.send({ error, success: false, message: "DB error: profile update error" });
              })
          }
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error: counselor details fetch error" });
        })
    }
  catch (error) {
    res.send({ error, success: false, message: "Unknown error" });
  }
}



// counselor profile picture update section

module.exports.updateProfilePicture = async (req, res) => {
  try {
    const fileFilter = (req, file, cb) => {
      if (file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg') {
        cb(null, true);
      }
      else {
        cb(null, false);
      }
    }
    const upload = multer({ storage: storage, fileFilter: fileFilter }).single('photo');
    upload(req, res, async (error) => {
      if (error) {
        console.log("photo could not uploaded: ", error);
      }
      else {
        let { userId } = jwt.decode(req.params.token);
        try {
          // console.log("userid: ", userId);
          await Counselor.findById(userId)
            .then(counselor => {
              let counselorData = {
                photo: req.file.filename ? req.file.filename : (counselor.photo ? counselor.photo : "")
              }
              Counselor.updateOne({_id : userId}, counselorData, {upsert : true})
                .then(doc => {
                  res.send({ data: doc, success: true, message: "details updated" });
                })
                .catch(error => {
                  res.send({ error, success: false, message: "DB error: profile update error" });
                })
            })
            .catch(error => {
              res.send({ error, success: false, message: "DB error: counselor details fetch error" });
            })
        }
        catch (error) {
          res.send({ error, success: false, message: "image upload error" });
        }
      }
    })
  }
  catch (error) {
    res.send({ error, success: false, message: "Unknown error" });
  }
}



// category add api

module.exports.addCategory = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.updateOne({_id : userId}, {$push : { categories : 
      { id : new mongodb(), name : req.body.category}
    }}, {new : true})  
    .then(doc =>{
      res.send({doc, success : true, message : "category added"});
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: add category"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}

// get category

module.exports.getCategory = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.findOne({_id : userId}, {categories : 1})  
    .then(doc =>{
      res.send({doc : doc.categories, success : true, message : "category added"});
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: add category"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
  }
}

module.exports.deleteCategory = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    // console.log("userid: ", userId);
    let id = new mongodb(req.body.id);
    Counselor.updateOne({_id : userId},{
      $pull : {
        'categories' : {id : id},
        'audios' : {type : req.body.id}
      }
    })
    .then(doc =>{ 
      res.send({doc, success : false, message : "category deleted"});
    })  
    .catch(error =>{
      res.send({error, doc : {},success : false, message : "DB error in category deleted"});
    })
  } 
  catch (error) {
    res.send({error, doc : {},success : false, message : "unknown error"});
  }
}



module.exports.logout = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    let newData = {
      fcmToken : ""
    }
    Counselor.updateOne({_id : userId}, newData)
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




// get message exchange count and payment

module.exports.exchangeCount = async(req, res) => {
  try {
    let {userId} = jwt.decode(req.params.token);
    
    Counselor.find({_id : userId}, { _id: 1 })
      .then(async doc => {
        for (let n = 0; n < doc.length; n++) {
          console.log("doc: n", doc[n]);
          let prevData = await CounselorPayment.find({ counselorId: doc[n]._id});
          // res.send({prevData});
          if (prevData.length > 0) {
            for (let i = 0; i < prevData.length; i++) {

              if (prevData[i].payment.length == 0) {
                console.log("in if: ");
                // console.log("prev data: ", prevData[i]._id);
                // console.log("time: ", prevData[i].payment[prevData[i].payment.length - 1].endDate.getDay());
                // let date = prevData[i].payment[prevData[i].payment.length - 1].endDate;
                let newMsgs = await Chat.find({
                  counsellor_id: doc[n]._id,
                  user_id: prevData[i].userId,
                  time : {$exists : true}
                  // time: { $gt: date }
                }).sort({time : 1});
                let arr = [];
                // res.send({newMsgs});
                for(let j = 0; j< newMsgs.length;){
                  let curr = newMsgs[j].time;
                  // console.log("curr: ", curr.toISOString());
                  let firstday = new Date(curr.setDate(curr.getDate() - curr.getDay()+1));
                  let lastday = new Date(curr.setDate(curr.getDate() - curr.getDay()+7));
                  console.log("first day: ", firstday, " ", lastday);
                  console.log(" ");

                  arr = newMsgs.filter(item =>{
                    return item.time >= firstday && item.time <= lastday; 
                  })
                  .map(data => { return data.role });

                  console.log("arr.length: ", arr.length);
                  j = j+arr.length;
                  console.log("arr: ", arr);
                  console.log(" ");
                  let gc = 0;
                  for (let k = 0; k < arr.length; k++) {
                    let first = arr[k + 1] ? arr[k + 1] : arr[k];
                    let c = 0;
                    loop2:
                    for (let l = k + 1; l < arr.length; l++) {
                      if (first != arr[l]) {
                        // console.log("first: ", first, " array[k]: ", arr[j]);
                        first = arr[l];
                        c++;
                      }
                      if (c == 2) {
                        gc++;
                        k = l;
                        c = 0;
                        continue loop2;
                      }
                    }
                    // console.log("C: ", c);
                  }
                  console.log("gc: ", gc);
                  let paymentdata = {
                    startDate : firstday,
                    endDate : lastday,
                    amount: gc >= 1 ? 25 : 0,
                    status: 8,
                    exchangeCount: gc,
                  }
                  CounselorPayment.updateOne({_id : prevData[i]._id}, {$push : {payment : paymentdata}})
                  .then(doc =>{
                    console.log("updated doc: ", doc);
                  })
                  .catch(error =>{
                    console.log("error: ", error);
                  })
                }

              }
              else{
                let curr = new Date();

                let firstday = new Date(curr.setDate(curr.getDate() - curr.getDay()+1));
                let lastday = new Date(curr.setDate(curr.getDate() - curr.getDay()+7));
                console.log("prevData: ", prevData[i].payment);
                let arr = prevData[i].payment.filter(item =>{
                  console.log("item.startDate.toISOString(): ", item.startDate.toISOString().substring(0,10));
                  item.startDate.toISOString().substring(0,10) == firstday.toISOString().substring(0,10) &&
                  item.endDate.toISOString().substring(0,10) == lastday.toISOString().substring(0,10)
                })
                console.log("arr: ", arr);
              }
            }
          }
          res.send({success : true});
        }
      })
      .catch(error => {
        console.log("db error: ", error);
      })
  }
  catch (error) {
    console.log(error);
  }
}


module.exports.getPayment = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    let { month, year } = req.body;
    let months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    if (month && year) {

      let index = months.findIndex(item => item == req.body.month.toUpperCase());

      let weeks = util.getWeeksInMonth(req.body.year, index);

      // console.log("weeks: ", weeks);

      let myDate = new Date(`${req.body.year}, ${req.body.month}`);

      let first_date = new Date(`${req.body.year}-${index + 1}-02`)
      var last_date = new Date(myDate.getFullYear(), myDate.getMonth() + 1, 1);
      console.log("first_date: ", first_date, "  last_date: ", last_date);
      console.log(" ");

      CounselorPayment.aggregate([
        { "$match": { "counselorId": userId } },
        { "$unwind": "$payment" },
        { "$match": { "payment.startDate": { $gte: first_date } } },
        { "$match": { "payment.endDate": { $lte: last_date } } },
      ])
        .then(async doc => {
          // console.log("in aggregate: ", doc);
          // res.send({doc});
          let response = [];
          console.log("format: ", new Date().toISOString())
          for (let i = 0; i < weeks.length; i++) {
            console.log("i: ", i);
            let filterData = doc.filter(x => {

              return (
                x.payment.startDate.toISOString().substring(0, 10) >= weeks[i].start.toISOString().substring(0, 10) &&
                x.payment.endDate.toISOString().substring(0, 10) <= weeks[i].end.toISOString().substring(0, 10)
              )
            })
              
              let insert = {
                startDate: weeks[i].start,
                endDate: weeks[i].end,
                data: _.uniqBy(filterData, 'userId').map(item =>{
                  return { _id : item._id, amount : item.payment.amount, status : item.payment.status,
                    exchangeCount : item.payment.exchangeCount, counselorId : item.counselorId,
                    userId : item.userId, counsellorname : item.counsellorname,
                    username : item.username}
                })
              }
              
              response.push(insert);
            
            console.log("   ");
          }
          res.send({ response });
          
          
          // console.log("response: ", response);
        })
    }

    else {
      // let dt1 = new Date("2021-06-21");
      // let dt2 = new Date("2021-06-27");
      // console.log("in else: ", new Date());
      let curr = new Date();
      // console.log("curr: ", curr.toISOString());
      let dt1 = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      let dt2 = new Date(curr.setDate(curr.getDate() - curr.getDay() + 7));
      console.log(dt1, " ", dt2);
      CounselorPayment.find({ counselorId: userId })
        .then(doc => {
          doc = doc.filter(item => { return (item.payment.length > 0) })
          // console.log("doc.length: ", doc.length);
          doc = doc.map(item => {
            // console.log("item.payment: ", item.payment.length);
            item.payment = item.payment.filter(data => {
              // console.log("data: ", data);
              return (data.startDate >= dt1 && data.endDate <= dt2)
            })
            console.log("item.payment: ", item.payment);

            let pay, exchngCount;

            if (item.payment.length == 0) pay = 0, exchngCount = 0;

            else {
              pay = item.payment.reduce((acc, curr) => acc + curr.amount, 0);
              console.log("pay: ", pay);
              exchngCount = item.payment.reduce((acc, curr) => acc + curr.exchangeCount, 0);
            }
            return {
              counselorId: item.counselorId, userId: item.userId,
              counsellorname: item.counsellorname, username: item.username, amount: pay, message: exchngCount,
              status: 8
            }
          })
          // let data = [{startDate : dt1, endDate : dt2,data : doc}]
          res.send({ doc : {startDate : dt1, endDate : dt2, data : doc} });
          // let amount = doc.reduce((acc, curr) => acc + curr.payment.amount, 0);
          // res.send({
          //   doc: { amount, from: new Date(fromDate), to: new Date(toDate) },
          //   success: true, message: "data fetched"
          // });

          // console.log(amount);
        })
        .catch(error => {
          res.send({ error, doc: {}, success: false, doc: {}, message: "DB error" });;
        })
    }

  }
  catch (error) {
    res.send({ error, doc: {}, success: false, message: "Unknown error" });
  }
}





module.exports.createStripeAccount = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    // let date = req.body.date
    Counselor.findOne({_id : userId})
    .then(async doc =>{
      console.log(doc.email)
      if(!doc.accountId || doc.accountId == ""){
        console.log("in if");
        const account =  await stripe.accounts.create({
          type: 'express',
          country: 'us',
          email: doc.email,
          business_url : "https://coun.kushubmedia.com/",
          product_description : "very good products",
          business_type : 'individual',
          company : {
            name : 'mycompany'
          },
          // individual : {email : doc.email}, 
          capabilities: {
            card_payments: {requested: true},
            transfers: {requested: true}
          }
        });
        
        if (account.id) {
          console.log("account: ", account);
          // https://connect.stripe.com/express/oauth/authorize?redirect_uri=https://connect.stripe.com/hosted/oauth&client_id=
          // // ca_JZ83dDtXIgoigphs78IZVFV3uhXF3FAt&state=onbrd_Jgbk7n56voOaYWdmg5ZKHwnXZJ&stripe_user[country]=US#/
          // const person = await stripe.accounts.createPerson(
          //   account.id,
          //   {first_name: doc.firstName, last_name: doc.lastName, email : doc.email, phone : doc.mobileNumber,
          //     relationship : {owner : true}, gender : doc.genderApplies.toLowerCase()}
          // );
          Counselor.updateOne({ _id: userId }, { accountId: account.id }, { upsert: true })
            .then(doc => {
              console.log("account  id added", doc);
            })
            .catch(error =>{
               return (new Error('stripe error: ', error));
            })
          // const update_account = await stripe.accounts.update(
          //   account.id,
          //   {
          //     // business_type : 'individual',
          //     individual :{
          //       email : doc.email,
          //       first_name : doc.firstName,
          //       gender : doc.genderApplies.toLowerCase(),
          //       last_name : doc.lastName,
          //       phone : doc.mobileNumber,
          //     } ,
          //     business_profile : {
          //       name : "etherapyPro",
          //       product_description : "this is very good product",
          //       url : "https://coun.kushubmedia.com/"
          //     }
          //   }
          // );


          const accountLinks = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: 'https://coun.kushubmedia.com/userdashboard/payment-success',
            return_url: 'https://coun.kushubmedia.com/userdashboard/payment-success',
            type: 'account_onboarding',
          });
          
          if(accountLinks) res.send({data : accountLinks, person, success: true, message: "redirect to this link" });

          else return (new Error('stripe error'));
        }
        else{
          return (new Error('stripe error'));
        }
      }
      else{
        console.log("in else");
        const account = await stripe.accounts.retrieve(
          doc.accountId
        );
        console.log("account when already exists: ",account);
        if(account.capabilities.card_payments == 'inactive' || account.capabilities.platform_payments == 'inactive'){
          const deleted = await stripe.accounts.del(
            doc.accountId
          );

          const account =  await stripe.accounts.create({
            type: 'express',
            country: 'us',
            email: doc.email,
            business_url : "https://coun.kushubmedia.com/",
            product_description : "very good products",
            capabilities: {
              card_payments: {requested: true},
              transfers: {requested: true}
            }
          });
          console.log("account: ", account.id);
          Counselor.updateOne({_id : userId}, {accountId : account.id}, {upsert : true})
          .then(doc =>{
            console.log("account  id added", doc);
          })
          .catch(error =>{
            console.log("db error in accountId update: ", error);
          })
          // const update_account = await stripe.accounts.update(
          //   account.id,
          //   {
          //     // business_type : 'individual',
          //     individual :{
          //       email : doc.email,
          //       first_name : doc.firstName,
          //       gender : doc.genderApplies.toLowerCase(),
          //       last_name : doc.lastName,
          //       phone : doc.mobileNumber,
          //     } ,
          //     business_profile : {
          //       name : "etherapyPro",
          //       product_description : "this is very good product",
          //       url : "https://coun.kushubmedia.com/"
          //     }
          //   }
          // );
  
          const accountLinks = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: 'https://coun.kushubmedia.com/userdashboard/payment-success',
            return_url: 'https://coun.kushubmedia.com/userdashboard/payment-success',
            type: 'account_onboarding',
          });

          if(accountLinks) res.send({data : accountLinks, success : true, message : "redirect to this link"});

          else res.send({data : {}, success : false, message : "unknown stripe error"});
        }

        else{
          const loginLink = await stripe.accounts.createLoginLink(
            doc.accountId
          );
          if(loginLink) res.send({data : loginLink, success : true, message : "redirect to dashboard"});
          
          else{
            res.send({data : {}, success : false, message : "stripe error"});
          }
        }
        
      }
    })
    .catch(error =>{
      res.send({error, success : false, data : {}, message : "DB error"});;
    })
  } 
  catch (error) {
    res.send({error, data : {}, success : false, message : "Unknown error"});
  }
}





// Get details of counselor's stripe account

module.exports.getStripeDetails = async (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    Counselor.findById(userId)
    .then(async user =>{
      const account = await stripe.accounts.retrieve(
        user.accountId
        // 'acct_1J2DshPPl0jP65Uc'
      );
      res.send({account});
      // console.log(account.external_accounts.data[0]);
      // const card = await stripe.accounts.retrieveExternalAccount(
      //   user.accountId,
      //   account.external_accounts.data[0].id
      // );
      let cardData = {};
      if(card){
        console.log("in if")
        cardData = {
          brand : card.brand,
          expMonth : card.exp_month,
          expYear : card.exp_year,
          last4 : card.last4,
          type : card.funding
        }
      }
      if(account.capabilities.card_payments == 'inactive' || account.capabilities.platform_payments == 'inactive'){
        res.send({data : account, card : cardData, success : false, message : "try again"});
      }
      else{
        res.send({data : account, card : cardData, success : true, message : "success true"});       
      }
      // res.send({data : account.capabilities})
    })
    .catch(error =>{
      res.send({error, data : {}, success : false, message : "DB error"});
    })
  }
   catch (error) {
    res.send({error, data : {}, success : false, message : "Unknown error"});
  }
}



// withdraw money by counselor
module.exports.withdraw = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    let amount = req.body.amount;
    Counselor.findById(userId)
      .then(async user => {
        // const topup =  await stripe.topups.create({
        //   amount: 8000,
        //   currency: 'usd',
        //   description: 'Top-up for week of May 31',
        //   statement_descriptor: 'Weekly top-up',
        //   source : 'btok_us_verified'
        // });
        console.log("amount: ", amount, user.accountId);
        const transfer = await stripe.transfers.create({
          amount: amount,
          currency: 'usd',
          destination: user.accountId
        });
        if(transfer){
          res.send({ data: transfer, success: true, message: "Transaction : Success" });
        }
        else{
          res.send({ data: transfer, success: false, message: "Transaction : failed" });
        }
      })
      .catch(error => {
        res.send({ error, data: {}, success: false, message: "DB error" })
      })
  }
  catch (error) {
    res.send({ error, data: {}, success: false, message: "Transaction : Failure" });
  }
}


module.exports.getPayoutList = (req, res) =>{
  try {
    let {userId}  = jwt.decode(req.params.token);
    Counselor.findOne({_id : userId})
    .then(async user =>{
      const transfers = await stripe.transfers.list({
        destination : 'acct_1J2X4oPA9FNFFEmo',
        limit: 20,
      });
      if(transfers){
        let data = transfers.data.map(item =>{
          console.log("item: ", item);
          return {date : new Date(item.created*1000).toDateString(), 
            description : "Monthly payment", amount : item.amount,
          type : "Online Transaction"}
        })
        console.log("data: ", data);
        res.send({data : data, success : true, message : "data fetch success"});
      }
      else{
        res.send({error, success : false, data : {}, message : "Stripe error"});
      }
    })
    .catch(error =>{
      res.send({error, success : false, data : {}, message : "DB error"});
    }) 
  } 
  catch (error) {
    res.send({error, success : false, data : {}, message : "Unknown error"});
  }
}




module.exports.deleteacc = async (req, res) => {
  try {
    const accounts = await stripe.accounts.list({
      limit: 100,
    });
    res.send({ data: accounts.data.length });
    for (let i = 0; i < accounts.data.length; i++) {
      const deleted = await stripe.accounts.del(
        accounts.data[i].id
      );
      console.log("deleted: ", deleted);
    }
    Counselor.updateMany({accountId : {$exists : true}}, {$set : {accountId : ""} })
    .then(doc =>{
      console.log("doc: ", doc);
    })
  }
  catch (error) {
    res.send({ error, data: {}, success: false, message: "Transaction : Failure" });
  }
}













module.exports.bulk_accept = async (req, res) => {
  try {
    let counselorId = jwt.decode(req.params.token).userId;
    let counselorData = await Counselor.findById(counselorId);
    if (counselorData.status == 'inactive') {
      return res.send({ status: counselorData.status, success: false, message: "your application is pending to review" });
    }
    let users = await userModel.find({ counselorId: "5fc9cb88db493e26f44e9622" }, { _id: 1, username: 1 })
    res.send({users});
    // console.log(users.length);

    for (let i = 0; i < users.length; i++) {
      let userId = users[i]._id
      Chat.deleteMany({ user_id: userId })
        .then(deleted => {
          console.log("old chat deleted");
        })
        .catch(error => {
          console.log("db error in old chat deletion");
        })

      let threadData = new Chat(
        {
          counsellor_id: counselorId,
          counsellorname: counselorData.userName,
          username: users[i].username,
          joinId: userId + "-" + counselorId,
          message: counselorData.introMessage ? counselorData.introMessage : "",
          type: "text",
          visible: false,
          role: 1,
          user_id: userId,
          time: Date.now()
        }
      )
      let videoData = new Chat({
        counsellor_id: counselorId,
        counsellorname: counselorData.userName,
        username: users[i].username,
        joinId: userId + "-" + counselorId,
        message: counselorData.introVideo ? counselorData.introVideo : "",
        type: "video",
        visible: false,
        role: 1,
        user_id: userId,
        time: Date.now()
      })
      await threadData.save()
        .then(chat => {
          videoData.save()
            .then(document => {
              console.log("intro video send to user");
            })
          let joinId = userId + "-" + counselorId;
          let userData = {
            joinId: joinId,
            counselorId: counselorId,
            lastMessage: chat
          }
          console.log("counselor assing to user");

          userModel.updateOne({ _id: userId }, userData)
            .then(userDetails => {
              console.log("joinid and counselor id saved in user model");
            })
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error : thread data save error" });
        })
        console.log("i: ", i);
        console.log("  ");
    }

  }
  catch (error) {
    res.send({ error, success: false, message: "something goes wrong in counselor assignment" });
  }
}