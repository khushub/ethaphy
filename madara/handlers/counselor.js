const Helper = require('../handlers/helper');
var logger = require('log4js').getLogger();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const moment = require('moment');
const mongodb = require('mongodb').ObjectID;


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
    Counselor.findOne({_id : userId}, {audios : 1})
    .then(doc =>{
      res.send({doc : doc.audios, success : true, message : "document fetched"});
    })  
    .catch(error =>{
      res.send({error, success : false, message : "DB error in doc fetch"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "Unknown error"});
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
    console.log("emd date: ", endDate);

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
              console.log("t1 and t2 is: ", t1, t2);
              
              return {status : data.status, time : t1+"-"+t2}  
            })
            // res.send({newSlots})
            if(days[i.getDay()] === availability[j].day){
              // console.log("i.toDateString(),: ", i.toUTCString());
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
        let date = new Date(req.body.startDate).toISOString().substring(0,10);
        console.log("date: ", date);
        CounselorToUser.aggregate([
          { "$match": {"counselorId" : userId} },
          { "$match": { "date": { $gte: date } } },
          { "$unwind": "$slots" },
          { "$match": {"slots.status" : 3} }
        ])
        .then(doc =>{
          // console.log("doc: ", doc);
          arrayOfUpcoming = arrayOfUpcoming.map(item =>{
              item.slot = item.slot.map(data =>{
                for(let i=0;i<doc.length; i++){
                  if(doc[i].slots.time == data.time){
                    return { status : 3, time : data.time}
                  }
                  else{
                    return { status : 0, time : data.time}
                  }
                }
              })
              return {day : item.day, date : item.date, status : item.status, slot : item.slot} ;
          })
          res.send({
            arrayOfUpcoming, 
            doc});
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
    console.log("counselor: ", counselor.timezone);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat","Sun"];
    let workingHours = await Slot.findOne({counselorId: userId});
    // console.log("working hours: ", workingHours);
    if(!workingHours || workingHours.availability.length == 0){
      console.log("in if");
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
      console.log("time stamp1: ", timeStamp1.split(":"));
      let timeStamp2 = new Date(Date.UTC(`${year}`, `${month}`, `${currentDate}`,
      `${item.slot[length-1].time.split("-")[1].split(":")[0]}`,
      `${item.slot[length-1].time.split("-")[1].split(":")[1]}`, `00`)).toLocaleTimeString();

      let splited1 = timeStamp1.split(":");
      let splited2 = timeStamp2.split(":");

      // console.log(splited1, " ",splited2);

      return { day : item.day, status : item.status,
      startTime : splited1[0]+":"+splited1[1]+" "+splited1[2].substring(3,5), 
      endTime : splited2[0]+":"+splited1[1]+" "+splited1[2].substring(3,5)}
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
        timezone : counselor.timezone ? counselor.timezone : "", 
        success : true, 
        message : "slot fetched from today onwards"
      });
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: upcoming slot fetch"});
    })
  } 
  catch (error) {
   res.send({error, success : false, message : "error in upcoming slot fetch"});
  }
}





// get all upcoming booking from today onwards

module.exports.forCalendar = async (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    console.log("userid: ", userId);
    let data = [];
    let date = new Date().toISOString().substring(0,10);
    console.log("date: ", date);
    await CounselorToUser.find({counselorId : userId})
    .then(async doc =>{
      console.log("doc: ", doc);
      console.log(doc.length);
      let i = 0;
      let n=0;
      while(i<doc.length){
        console.log(i)
        await userModel.findById(doc[i].userId)
        .then(async user =>{
          console.log("user: ", user.username, doc[i].slots.length);
          for(let j =0; j<doc[i].slots.length; j++){
            data[n] = {
              _id : doc[i]._id,
              name :  user.username,
              date : doc[i].date,
              slot : doc[i].slots[j]
            }
            n++;
          }
          
        })
        .catch(error =>{
          res.send({error, success : false, message : "user details fetch error"});
        })
        i++;
      }
      console.log(data.length)
      res.send({data , success : true, message : "All slot fetch for a user"});
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: for all slot fetch"});
    })
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

module.exports.bookSession = (req, res) =>{
  try {
    let counselorId = jwt.decode(req.params.token).userId;
    let date = new Date(req.body.date).toString().substring(0, 15);
    let{userId , time} = req.body;
    CounselorToUser.findOne({counselorId : counselorId, userId : userId, date : req.body.date})
    .then(doc =>{
      if(doc != null){
        let newSlot = {
          time : time,
          status : 3
        }
        doc.slots.push(newSlot);
        // res.send({doc});
        CounselorToUser.updateOne({_id : doc._id}, doc)
        .then(bookedSession =>{
          UpcomingSlots.updateOne({ counselorId: counselorId },
            { $set: { 'availability.$[a].slot.$[s].status': 3 } },
            { arrayFilters: [{ 'a.date': date }, { 's.time': time }] })
            .then(result =>{
              console.log(result);
            });
          res.send({data : bookedSession, success : true, message : "sessions updated"});
        })
        .catch(error =>{
          res.send({error, success : false, message : "booking data save error"});
        })
      }
      else{
        // console.log("slot: in else ", slot)
        let newSlot = {
          time : time,
          status : 3
        }
        let sessionData = new CounselorToUser({
          counselorId : counselorId,
          userId : userId,
          date : req.body.date,
          slots : [newSlot]
        });
        sessionData.save()
        .then(bookedSession =>{
          UpcomingSlots.updateOne({ counselorId: counselorId },
            { $set: { 'availability.$[a].slot.$[s].status': 3 } },
            { arrayFilters: [{ 'a.date': date }, { 's.time': time }] })
            .then(result =>{
              console.log(result);
            });
          res.send({data : bookedSession, success : true, message : "booking confirmed"});
        })
        .catch(error =>{
          res.send({error, success : false, message : "booking data save error"});
        })
      }
    })
    .catch(error =>{
      res.send({error, success : false, message : "session data save error"});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "unknown error"});
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

module.exports.inbox = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    Chat.find({ counsellor_id: userId , type : {$ne : "draft"}}).sort({ "time": -1 })
      .then(async doc => {
        if (doc.length == 0 || !doc) {
          res.send({ data: {}, success: false, message: "no message found" });
        }
        else {
          let array = _.uniqBy(doc, 'username');
          let trial =0, active =0, inactive = 0;
          // let key = 'user_id';
          // const array = [...new Map(doc.map(item =>
          //   [item[key], item])).values()];
          // console.log("arrayUniqueByKey: ", array);
          for (let i = 0; i < array.length; i++) {
            if (array[i].username) {
              console.log(array[i].username);
              await userModel.findOne({ _id: array[i].user_id })
                .then(async user => {
                  console.log("user: ", user);
                  if(user){
                    let userThread = await Chat.find({
                      counsellor_id:userId,
                      username:array[i].username,
                      visible : false,
                      role : "0"
                    })
                    console.log("userthread:v", userThread.length);
                    array[i] = array[i].toJSON();
                    array[i].status = user.status;
                    array[i].profilePhoto = user.profilePhoto;
                    if(user.status == 'trial') trial = trial + 1;
                    if(user.status == 'active') active = active + 1;
                    if(user.status == 'inactive') inactive = inactive + 1;
                    array[i].messageCount = userThread.length;
                  }
                })
            }
          }
          let data = {all : trial+active+inactive, trial, active, inactive, array}
          res.json(data).status(200);
        }
      })
      .catch(error => {
        res.status(500).send({ error, success: false, message: "DB error:  inbox data fetch" });
      })
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
    if (req.body.status == 0) {
      Chat.findOne({ username: req.body.id, role: "0" }).sort({ time: -1 })
        .then(chat => {
          Chat.updateOne({ _id: chat._id }, { $set: { visible: false } })
            .then(doc => {
              console.log("doc: ", doc);
              res.send({ success: true, message: "thread status updated" });
            })
            .catch(error => {
              res.send({ error, success: false, message: "DB error : thread status update" });
            })
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error: thread status update" });
        })
    }
    else {
      Chat.updateMany({ username: req.body.id, role: "0" }, { $set: { visible: true } },
        { new: true })
        .then(chat => {
          res.send({ success: true, message: "message status updated" });
        })
        .catch(error => {
          res.send({ error, success: false, message: "DB error: message status update" });
        })
    }
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
    // let counselorId = req.params.token;
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
        user_id : userId
      }
    )
    await threadData.save()
      .then(chat => {
        console.log("chat : ", chat);
        let joinId = userId + "-" + counselorId;
        let userData = {
          joinId : joinId,
          counselorId : counselorId
        }
        userModel.updateOne({_id : userId}, userData)
        .then(userDetails =>{
          console.log("joinid and counselor id saved in user model: ", userDetails);
        })
        res.send({ thread: chat, joinId, success: true, message: "counselor assing to user" });
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

module.exports.exchangeCount = async (req, res) =>{
  try {
    let counselorId  = jwt.decode(req.params.token).userId;
    console.log("counselorId: ", counselorId);
    let allMessages = await Chat.find({counsellor_id : counselorId, role : {$exists : true}}).sort({ "time": -1 });
    
    let uniqByJoinId = _.uniqBy(allMessages, 'joinId');
    let allJoinId = [];
    let date = new Date();
    // console.log("date is: ", date.getDay());
    
    for(let i = 0; i< uniqByJoinId.length; i++){
      // console.log("uniqByJoinId[i].joinId: ", uniqByJoinId[i].joinId);
      allJoinId[i] = uniqByJoinId[i].joinId;
      // console.log("alljoinid: ", allJoinId[i]);
    }
    for(let n = 0; n < allJoinId.length; n++){
      // console.log("allMessages.filter : ", allMessages.filter(item => item.joinId == allJoinId[n]));
      let arr = allMessages.filter(item => item.joinId == allJoinId[n]).map(item => {return item.role});
      let gc = 0;
      console.log("arr: ",arr.toString());
      loop1 :
      for(let i = 0; i< arr.length; i++){
        let first = arr[i+1] ? arr[i+1] : arr[i];
        let c = 0;
        loop2 :
        for(let j=i+1; j <arr.length; j++){
          if(first != arr[j]){
            // console.log("first: ", first, " array[k]: ", arr[j]);
            first = arr[j];
            c++;
          }
          if(c ==2){
            gc++;
            i = j; 
            c=0;
            continue loop2;
          }
        }
        // console.log("C: ", c);
      }
      // console.log("after loops: ", uniqByJoinId[n])
      let lastMessage = allMessages.filter(item => item.user_id == uniqByJoinId[n].user_id);
      const paymentData = new CounselorPayment({
        counselorId : counselorId,
        counsellorname : lastMessage[0].counsellorname,
        userId : lastMessage[0].user_id,
        username : lastMessage[0].username,
        payment : {
          amount : gc >= 1 ? 25 : 0,
          exchangeCount : gc,
          status : 8,
          startDate : lastMessage[lastMessage.length-1].createdAt.toISOString().substring(0,10),
          endDate : lastMessage[0].createdAt.toISOString().substring(0,10)
        }
      })
      console.log("paymentData: ", paymentData);
      paymentData.save()
      .then(doc =>{
        console.log("counselorData saved", doc);
      })
      .catch(error =>{
        console.log("error: " , error);
      })
    }
    res.send({length: allMessages.length});
  } 
  catch (error) {
    res.send({error});
  }
}


module.exports.getPayment = (req, res)=>{
  try {
    let {userId} = jwt.decode(req.params.token);
    CounselorPayment.find({counselorId : userId})
    .then(doc =>{
      res.send({doc})
    })
    .catch(error =>{
      res.send({error});
    })
  } 
  catch (error) {
    res.send({error, success : false, message : "Unknown error"});
  }
}