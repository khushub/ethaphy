//Required Models
const User = require('../models/userModel');
const Counselor = require('../models/counselorModel');
const Admin = require('../models/adminModel');

// Required Helper Function
const Helper = require('../handlers/helper');




//Admin Register
module.exports.register = (req, res) =>{
    try {
        const admin = new Admin({
            username : req.body.username,
            password : Helper.hashPassword(req.body.password)
        });
        admin.save()
        .then(doc =>{
            res.send({doc, success : true, message : "admin registered"});
        })
        .catch(error =>{
            res.send({error, success : false, message : "DB error in admin register"});
        })
    } 
    catch (error) {
        res.send({error, success : false, message : "Unknown error"});
    }
}


// Admin Login
module.exports.login = (req, res) =>{
    try {
        let {username, password} = req.body;
        if(!username || !password) return res.send({success : false, message : "missing field/'s"});

        else{
            Admin.findOne({username : username})
            .then(doc =>{
                if(!doc) return res.send({data : {}, success : false, message : "No such user found"});

                if(!Helper.comparePassword(doc.password, password)){
                    return res.send({data : {}, success : false, message : "Incorrect password"});
                }
                else{
                    const token = Helper.generateToken(doc._id);
                    const data = {doc, token}
                    res.send({data, success : true, message : "admin login success"});
                }
            })
            .catch(error =>{
                res.send({error, success : false, message : "DB error"});
            })
        }    
    } 
    catch (error) {
        res.send({error, success : false, message : "unknown error"});
    }
}


// Get All User
module.exports.userList = (req, res) =>{
    try {
        User.find({})
        .then(users =>{
            res.send({users, success : true, message : "users list fetched"});
        })
        .catch(error =>{
            res.send({error, success : false, message : "DB error"});
        })
    }
    catch (error) {
        res.send({error, success : false, message : "Unknown error"});
    }
}



// Get all Counselor
module.exports.counselorList = (req, res) =>{
    try {
        Counselor.find({})
        .then(counselors =>{
            res.send({counselors, success : true, message : "counselors list fetched"});
        })
        .catch(error =>{
            res.send({error, success : false, message : "DB error"});
        })
    }
    catch (error) {
        res.send({error, success : false, message : "Unknown error"});
    }
}


// Get Counselor Profile
module.exports.getCounselor = (req, res) =>{
    try {
        if(!req.body.id) return res.send({success : false, message : "counselor id missing"});

        Counselor.findById(req.body.id)
        .then(counselor =>{
            if(!counselor) return res.send({data : {}, success : false, message : "no counselor found"});

            else{
                res.send({data : counselor, success : true, message : "counselor details fetched"});
            }
        })    
        .catch(error =>{
            res.send({error, success : false, message : "DB error"});
        })
    } 
    catch (error) {
        res.send({error, success : false, message : "Unknown error"});
    }
}


module.exports.updateCounselor = (req, res) =>{
    try {
      let newData = {
        status  : req.body.status
      }  
      Counselor.updateOne({_id : req.body.counselorId}, newData)
      .then(doc =>{
          Counselor.findOne({_id : req.body.counselorId}, {status : 1})
          .then(data  =>{
              res.send({data, success : true, message : "status updated"});
          })
      })
      .catch(error =>{
          res.send({error, success : false, message : "DB error"});
      })  
    } 
    catch (error) {
        res.send({error, success : false, message : "Unknown error"});
    }
}