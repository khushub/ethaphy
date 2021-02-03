const Helper = require('../handlers/helper');
var logger = require('log4js').getLogger();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const Chat = require('../models/chatModel');

// required model
const Counselor = require('../models/counselorModel');
const Slot = require('../models/slotModel');
const CounselorToUser = require('../models/counselorToUser');
const OTP = require('../models/otpModel');
const userModel = require('../models/userModel');
const UpcomingSlots = require('../models/upcomingAvailability')


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
      cb(null, './uploads/counselor/');
    }
    if (file.mimetype == 'video/mp4') {
      cb(null, './uploads/counselr/introVideo/');
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

                photo: req.file.path,

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
            url : req.file.path,
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


// add weekly availability
 
module.exports.addWeeklyAvailability = async (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token); // sepearting userid of counselor from  token
    await Slot.deleteMany({ counselorId: userId })
      .then(result => {
        console.log("result", result);
      })
      .catch(error => {
        console.log("error: ", error);
      })


    const daysArray = req.body.daysArray;  // array of availability of days 

    const startTimeArray = req.body.startTimeArray; // start time array of days

    const endTimeArray = req.body.endTimeArray;     // end time array of days

    let finalArray = [];
    // inserting doc in db for each day    
    let i = 0;
    daysArray.forEach(async(day) => {
      let startTime = new Date().toISOString().substring(0, 10) + " " + startTimeArray[i]; // start time for a day

      // console.log("start time: ", startTime);
      let date = new Date(startTime);
      // console.log("date: ",date.toUTCString());

      // do sloting here
      let slot = [];
      let timeSlot = [];
      let j = 0;
      let compareTime = date.getTime();
      console.log("comparetime: ", compareTime);
      let endTime = new Date(new Date().toISOString().substring(0, 10) + " " + endTimeArray[i]); // end time for a day
      console.log("end time : ", endTime);


      // making slots for a day
      while (endTime.getTime() >= compareTime) {
        slot[j] = date.setMinutes(date.getMinutes() + 30);

        // formatting unix time_stamp to date_time 
        let dt = new Date(compareTime);
        compareTime = slot[j];

        let time = dt.getHours() + ':' + dt.getMinutes();
        timeSlot[j] = time;
        j++;
        // console.log("time slot: ", timeSlot);
      }
      finalArray[i] = {
        day: day,
        status: 'active',
        slot: timeSlot.map((time, index, array) => {
          if (array[index + 1] !== undefined) return { status: 0, time: time + "-" + array[index + 1] };
        })
          .filter((time) => {
            return time !== undefined;
          })
      }
      // console.log("time slot: ", timeSlot);
      i++;
    });

    const slotDB = new Slot({
      counselorId: userId,
      availability: finalArray
    });
    await slotDB.save()
      .then(async (response) => {
        // console.log("res", response.availability);
        const availability = response.availability
        let startDate = new Date();
        let endDate = new Date();
        endDate.setMonth(endDate.getMonth()+1);
        console.log("start date: ", startDate, " ", endDate);

        const days = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let arrayOfUpcoming = [];
        for(let i = startDate, k=0; i<= endDate; i.setDate(i.getDate()+1)){
          console.log("date is: ",i.toLocaleDateString() ,days[i.getDay()]);

          for(let j = 0; j < availability.length; j++){
            // console.log("available day: ", availability[j].day);
            if(days[i.getDay()] === availability[j].day){
              arrayOfUpcoming[k] = {
                day : availability[j].day,
                date : i.toDateString(),
                status : 'active',
                slot : availability[j].slot
              }
              k++;
            }
          }
        }
        console.log(arrayOfUpcoming);
        const upcomingSlot = new UpcomingSlots({
          counselorId : userId,
          availability : arrayOfUpcoming
        });
        await upcomingSlot.save()
        .then(doc =>{
          doc.availability = doc.availability.map(slots =>{

            let dataArray = slots.slot.map(data =>{
              return {time : data.time, status : data.status}
            })
  
            console.log(" slots.slot", slots.day);
            return {day : slots.day, date: slots.date ,dataArray}
          })
          res.send({data: doc.availability, success: true, message: "data saved" });
        })
        .catch(error =>{
          res.send({error});
        })
      })
      .catch(error => {
        console.log("error", error);
        res.send({ error: error, success: false, message: "error at sloting" });
      })
  }
  catch (error) {
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
    const availability = weekAvailability.availability;

    if (!weekAvailability) {
      res.send({ data: {}, success: false, message: "You need to set your weekly availability" });
    }
    else {
      if (startDate.toLocaleDateString() == endDate.toLocaleDateString()) {
        const slotDB = new UpcomingSlots({
          counselorId: userId,
          availability: availability
        });
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
        let finalArray = [];
        await UpcomingSlots.find({counselorId : userId})
          .then(doc => {
            let array = doc[0].availability;
            console.log("arrayDate: ", new Date(array[array.length - 1].date).toISOString());
            console.log("startDate: ", startDate);
            if (new Date(array[array.length - 1].date).toISOString().substring(0, 10) < startDate.toISOString().substring(0, 10)) {
              console.log("in if condition");
              let i = new Date(array[array.length - 1].date).toISOString();
              for (i; i <= endDate; i.setDate(i.getDate() + 1)) {
                let k = 0;
                console.log("date is: ", i.toLocaleDateString(), days[i.getDay()]);

                for (let j = 0; j < availability.length; j++) {
                  // console.log("available day: ", availability[j].day);
                  if (days[i.getDay()] === availability[j].day) {
                    console.log("in if count: ");
                    finalArray[k] = {
                      day: availability[j].day,
                      date: i.toDateString(),
                      status: 'active',
                      slot: availability[j].slot
                    }
                    k++;
                  }
                }console.log("finalArray: ",finalArray);
              }
              
            }
            res.send({ startDate });
          })
       
        // for (let i = startDate, k = 0; i <= endDate; i.setDate(i.getDate() + 1)) {
        //   console.log("date is: ", i.toLocaleDateString(), days[i.getDay()]);

        //   for (let j = 0; j < availability.length; j++) {
        //     // console.log("available day: ", availability[j].day);
        //     if (days[i.getDay()] === availability[j].day) {
        //       console.log("in if count: ");
        //       finalArray[k] = {
        //         day: availability[j].day,
        //         date: i.toDateString(),
        //         status: 'active',
        //         slot: availability[j].slot
        //       }
        //       k++;
        //     }
        //   }
        // }
        // console.log(finalArray);
        // const slotDB = new UpcomingSlots({
        //   counselorId: userId,
        //   availability: finalArray
        // });
        // await slotDB.save()
        //   .then(doc => {
        //     res.send({ doc });
        //   })
        //   .catch(error => {
        //     res.send({ error });
        //   })
      }
    }

  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error: set upcoming slots" });
  }
}


// get upcoming slot from today onwards

module.exports.getUpcomingSlots = async (req,res)=>{
  try {
    let { userId } = jwt.decode(req.params.token);
    await UpcomingSlots.findOne({counselorId : userId})
    .then(data =>{
      data[0].availability = data[0].availability.filter(slot =>{
        // console.log(new Date(slot.date).toLocaleDateString(), "     ", new Date().toLocaleDateString());
        return new Date(slot.date).toLocaleDateString() >= new Date().toLocaleDateString();
      })
      res.send({data : data[0].availability, success : true, message : "slot fetched from today onwards"});
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
    await CounselorToUser.find({counselorId : userId, date : {$gte : date}})
    .then(async doc =>{
      console.log(doc.length);
      for(let i=0; i < doc.length; i++){
        await userModel.findById(doc[i].userId)
        .then(async user =>{
          // console.log("user: ", user.username, doc[i].date);
          data[i] = {
            name :  user.username,
            date : doc[i].date,
            slots : doc[i].slots
          }
        })
        .catch(error =>{
          res.send({error, success : false, message : "user details fetch error"});
        })
      }
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
            console.log("user: ", user);
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
    const date = new Date(req.body.date).toString().substring(0, 15);
    const timeSlot = req.body.slot;
    let { userId } = jwt.decode(req.params.token);
    console.log("userid: ", userId, date);
    await UpcomingSlots.find({ counselorId: userId })
      .then(async (doc) => {
        let status;
        doc[0].availability = await doc[0].availability.filter(doc => {
          return doc.date === date;
        });
        status = await doc[0].availability[0].slot.filter(slots => {
          return slots.time === timeSlot;
        })
        console.log("status: ", status[0].status);
        await UpcomingSlots.updateOne({ counselorId: userId },
          { $set: { 'availability.$[a].slot.$[s].status': status[0].status === 0 ? 1 : 0 } },
          { arrayFilters: [{ 'a.date': date }, { 's.time': timeSlot }] })
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
    let date = new Date(req.body.date).toString().substring(0, 15);
    console.log("date is: ", date, " userId: ", userId);
    await UpcomingSlots.find({ counselorId: userId })
      .then(async doc => {
        doc[0].availability = await doc[0].availability.filter(doc => {
          return doc.date === date;
        });
        console.log(doc[0].availability[0].status);
        await UpcomingSlots.findOneAndUpdate(
          { counselorId: userId, "availability.date": date },
          { $set: { "availability.$.status": doc[0].availability[0].status ==='active' ? 'inactive' : 'active'}},
          { new: true }
        )
          .then(doc => {
            res.send({ doc, success: true, message: "slot disable for specified date" });
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



// counselor inbox

module.exports.inbox = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token);
    // let userId = req.params.token;
    Chat.find({ counsellor_id: userId , message_type : "text"})
      .then(async doc => {
        if (doc.length == 0 || !doc) {
          res.send({ data: {}, success: false, message: "no message found" });
        }
        else {
          // console.log("doc: ", doc);
          let array = _.uniqBy(doc, 'username');
          for(let i=0; i< array.length; i++){
            console.log(array[i].user_id);
            await userModel.findOne({_id : array[i].user_id})
            .then(user =>{
              array[i] = array[i].toJSON();
              array[i].status = user.status
              console.log("user: ", array[i]);
              // console.log(user.status);
            })
          }
          res.send({ data: array, success: true, message: "inobx data fetched" });
        }
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error:  inbox data fetch" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "unknown error" });
  }
}

// take action against message 

module.exports.action = (req, res) =>{
  try {
    let {userId} = jwt.decode(req.params.token);
    console.log("userid: ", userId);
    Chat.findOneAndUpdate({_id : req.body.id, counsellor_id : userId}, {$set : {__v : req.body.status}}, {new : true})
    .then(chat =>{
      res.send({data : chat, success : true, message : "message status updated"});
    })
    .catch(error =>{
      res.send({error, success : false, message : "DB error: message status update"});
    })
  } 
  catch (error) {
    res.send({error , success : false, message : "Unknown error"});
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

module.exports.getMessages =  (req, res) => {
  try {
      userModel.findById(req.body.userId)
      .then(user => {
        Chat.findOne({ user_id: req.body.userId })
          .then(thread => {
            let date = new Date().toISOString().substring(0, 10);
            let slots = CounselorToUser.find({ userId: req.body.userId, date: { $gte: date } })
            console.log("slot: ",  typeof slots);
            let data = thread.toJSON();
            data.status = user.status;
            slots = slots.map(slot =>{
              return {time  : slot.slots, date : slot.date };
            });
            console.log("slots: ", slots);
            data.slots = slots
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
          to: email,
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
    // let userId = req.params.token;
    await Counselor.findById(userId)
      .then(counselor => {
        Counselor.findOneAndUpdate({ _id: userId }, [
          {
            $set: {
              nickName: req.body.nickName ? req.body.nickName : "",
              aboutMe : req.body.aboutMe ? req.body.aboutMe : counselor.aboutMe,
              practiceYears : req.body.practiceYears ? req.body.practiceYears : counselor.practiceYears,
              attendedSchool : req.body.attendedSchool ? req.body.attendedSchool : counselor.attendedSchool,
              graduatedYear : req.body.graduatedYear ? req.body.graduatedYear : counselor.graduatedYear,
              licenseNumber : req.body.licenseNumber ? req.body.licenseNumber : counselor.licenseNumber,
              state : req.body.state ? req.body.state : "",
              specialities : req.body.specialities ? req.body.specialities : counselor.specialities,
              designations : req.body.designations ? req.body.designations : counselor.designations,
            }
          }
        ])
        .then(doc =>{
          res.send({data : doc, success : true, message : "details updated"});
        })
        .catch(error =>{
          res.send({error, success : false , message : "DB error: profile update error"});
        })
      })
      .catch(error => {
        res.send({ error, success: false, message: "DB error: counselor details fetch error" });
      })
  }
  catch (error) {
    res.send({ error, success: false, message: "Unknown error" });
  }
}