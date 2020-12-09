const Helper = require('../handlers/helper');
var logger = require('log4js').getLogger();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


// required model
const Counselor = require('../models/counselorModel');
const Slot = require('../models/slotModel');
const CounselorToUser = require('../models/counselorToUser');



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

              let mailTransport = nodemailer.createTransport({
                service : 'gmail',
                auth :{
                  user : 'edwy23@gmail.com',
                  pass : 'Rahul*******'
                }
              });

              let mailDetails = {
                from : 'edwy23@gmail.com',
                to : req.body.email,
                subject : 'Registration Success mail',
                text : ' You successfully registered to Etherapthy Pro'
              }

              counselor.save((error, response) => {
                if (error) {
                  res.send({ data: {}, error: error.message, message: "username or email already taken" }).status(500);
                }
                else {
                  const token = Helper.generateregisterationToken(response.id);
                  let data = {
                    response,
                    token
                  }
                  mailTransport.sendMail(mailDetails, (error, response) =>{
                    if(error){
                      res.send({data : {}, success : false, error, message :'Error in mail send in user registration'});
                    }
                    else{
                      res.send({data: data, success: true, message: "Counselor Registered and mail send to registered email"});
                    }
                  });
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

// Adding time slot from counselor end for a week
 
module.exports.addTimeSlot = (req, res) => {
  try {
    let { userId } = jwt.decode(req.params.token); // sepearting userid of counselor from  token

    // first delete all previous slots for that counselor
    Slot.deleteMany({counselorId : userId})
    .then(result =>{
      console.log("result", result);
    })
    .catch(error => {
      console.log("error: ", error);
    })


    const daysArray = req.body.daysArray;  // array of availibility of days 

    const startTimeArray = req.body.startTimeArray; // start time array of each days

    const endTimeArray = req.body.endTimeArray;     // end time array of each days

    // inserting doc in db for each day    
    let i = 0;
    daysArray.forEach(day => {
      let date = new Date(startTimeArray[i]);
      // console.log("date: ",date.toTimeString().substring(0,5));

      // do sloting here
      let slot = [];
      let timeSlot = [];
      let j = 0;
      let compareTime = date.getTime();

      while (new Date(endTimeArray[i]).getTime() >= compareTime) {
        slot[j] = date.setMinutes(date.getMinutes() + 30);

        // formatting unix time_stamp to date_time 
        let dt = new Date(compareTime);
        compareTime = slot[j];

        let time = dt.getHours() + ':' + dt.getMinutes();
        timeSlot[j] = time;
        j++;
      }

      // inserting slot timing in DB
      const slotDB = new Slot({
        counselorId: userId,
        day: day,
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
    res.send({ data: {}, message: "testing" });
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


module.exports.userAssignment = (req, res) =>{
  try {
      let counselorId = jwt.decode(req.params.token);
      let userId = req.body.userId

      let assignmentData = new CounselorToUser({
        counselorId : counselorId,
        userId : userId
      });
      assignmentData.save()
      .then(doc =>{
        res.send({doc, success : false, message : "counselor assing to user"});
      })
      .catch(error =>{
        res.send({error, success : false, message : "DB error in counselor assingment"});
      })
  } 
  catch (error) {
    res.send({error, success : false, message : "something goes wrong in counselor assignment"});
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







