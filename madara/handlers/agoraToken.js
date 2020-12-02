// required module
const jwt  = require('jsonwebtoken');
const {RtcTokenBuilder, RtcRole}  = require('agora-access-token');
const apn = require('apn');

const Counselor = require('../models/counselorModel');
const { options } = require('../router/userRoute');

const appId = "970CA35de60c44645bbae8a215061b33";
const appCertificate = "5CFd2fd1755d40ecb72977518be15d3b";
const expirationTimeInSeconds = 3600
const role = RtcRole.PUBLISHER

module.exports.generateAgoraToken = (req, res) =>{
    try {
        // let {userId} = jwt.decode(req.params.token);
        let userId = 0;
        let channel = req.body.channel;
        let currentTimeStamp = Math.floor(Date.now()/1000);
        let privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds;

        if(!channel){
            return res.send({error : 'channel name is required'});
        }
        const key = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, userId, role, privilegeExpiredTs);
        if(!key){
            res.send({error : 'RTC token generation error'})
        }
        else{
            let {userId} = jwt.decode(req.params.token);
            console.log("userid", userId);
            Counselor.findByIdAndUpdate({_id : userId}, [{$set : {agoraToken : key}}], {new: true})
            .then(doc =>{
                console.log("doc",doc);
            });
            res.send({token : key, success : true, message : "Token generation success"});
        }  
    } 
    catch (error) {
        res.send({error : error, success : false, message : "Something went wrong while rtc token generation"})
    }
}


module.exports.sendNotification = (req, res) =>{
    try {
        let {userId}  = req.params.token;
        Counselor.findById(userId, (error, doc) =>{
            if(error){
                return res.send({error : error, success : false, message : "DB error"});
            }
            else{
                if(!doc){
                    return res.send({doc : {}, success : false, message : "No data found"});
                }
                else {
                    let token = doc.agoraToken;

                    let option = {
                      cert :__dirname + '/cert.pem',
                      key : __dirname + '/key.pem'  
                    }

                    let apnConnection = new apn.Connection(options);
                    let myDevice = new apn.Device(token);
                    let note = new apn.Notification();
                    note.expiry = Math.floor(Date.now()/1000) + 3600;
                    note.badge = 3;
                    note.sound = "ping.aiff";
                    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
                    note.payload = { 'messageFrom' : 'Rahul'};
                    apnConnection.pushNotification(note, myDevice);

                    return res.send({success : true})
                }
            }
        })
    } 
    catch (error) {
        
    }
}