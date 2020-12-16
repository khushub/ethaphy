// required module
const {RtcTokenBuilder, RtcRole}  = require('agora-access-token');
const apn = require('apn');
const FCM = require('fcm-node');
const serverkey = require('../../privateKey.json');
const fcm = new FCM(serverkey);
const jwt = require('jsonwebtoken');

// required model
const Counselor = require('../models/counselorModel');
const User = require('../models/userModel');



// Agora token generation function

module.exports.generateAgoraToken = async (req, res) => {
    try {
        // require credentials for agora token genration
        const appId = "6bd9467439e245a8b068b16bb281608a";
        const appCertificate = "df1120feb9e147b0a0dd896f61566174";

        const expirationTimeInSeconds = 3600 // expiration time of token

        const role = RtcRole.PUBLISHER
        let userId = 0;
        let channel = req.body.channel;
        let typeOfCall = req.body.typeOfCall;
        let currentTimeStamp = Math.floor(Date.now() / 1000);
        let privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds;
        let receiverId = req.body.receiverId;
        let senderId = req.body.senderId;
        let receiverRole = req.body.receiverRole;
        let fcmToken;

        if (!channel || !receiverId || !receiverRole) {
            return res.send({ error: 'field is missing, either channel/receiverId/receiverRole' });
        }

        else {
            if (receiverRole === 'user') {
                await User.findById(receiverId)
                    .then(doc => {
                        fcmToken = doc.fcmToken;
                        console.log("user fcm token: ", fcmToken);
                    })
                    .catch(error => {
                        return res.send({ error, success: false, message: "DB fetch error for user device token" });
                    });
            }

            if (receiverRole === 'counselor') {
                await Counselor.findById(receiverId)
                    .then(doc => {
                        console.log("counselor fcm token: ", doc.fcmToken);
                        fcmToken = doc.fcmToken;
                    })
                    .catch(error => {
                        res.send({ error, success: false, message: "DB fetch error for counselor device token" });
                    })
            }

            const key = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, userId, role, privilegeExpiredTs);

            if (!key) {
                res.send({ error: 'RTC token generation error' });
            }

            else {
                // console.log("key: ", key);
                let message = {
                    "to": fcmToken,

                    "data": {
                        "token": key,
                        "typeOfCall": typeOfCall,
                        "channel": channel,
                        "senderId": senderId,
                        "receiverId": receiverId,
                        "agoraAppId": appId
                    },
                }

                fcm.send(message, (error, response) => {
                    if (error) {
                        console.log("error: ", error);
                        return res.send({ error: error, success: false, message: "something went wrong in sending message" });
                    }
                    else {
                        let data = {
                            token: key,
                            typeOfCall,
                            channel,
                            senderId,
                            receiverId,
                            agoraAppId: appId
                        }
                        res.send({ data, success: true, message: "Token generation success" });
                        console.log("response: ", response);
                        // res.send({ response, success: true, message: "succesfully send message and response" });
                    }
                })

            }
        }
    }
    catch (error) {
        res.send({ error: error, success: false, message: "Something went wrong while rtc token generation" })
    }
}




// Send iOS notification
module.exports.sendIOSNotification = (req, res) =>{
    try {
        let {userId}  = jwt.decode(req.params.token);
        Counselor.findById(userId, (error, doc) =>{
            if(error){
                return res.send({error : error, success : false, message : "DB error"});
            }
            else{
                if(!doc){
                    return res.send({doc : {}, success : false, message : "No data found"});
                }
                else {
                    let token = doc.fcmToken;

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
        res.send({error : error, success : false, message : "iOS notification send error"});
    }
}


// Send Android notification 
module.exports.sendAndroidNotification = (req, res) =>{
    let message = {
        to : req.body.registrationToken,

        notification : {
            title : 'this is title of message',
            body : 'body of push notification'
        },

        data : {
            key1 : 'my key value'
        }
    }

    fcm.send(message, (error, response) =>{
        if(error){
            console.log(error);
           res.send({error :error, success : false, message : "something went wron in sending message"});
        }
        else{
            console.log(response);
            res.send({response, success : true, message : "succesfully send message and response"});
        }
    })
}



// let {userId} = jwt.decode(req.params.token);
            // console.log("userid", userId);
            // Counselor.findByIdAndUpdate({_id : userId}, [{$set : {agoraToken : key}}], {new: true})
            // .then(doc =>{
            //     console.log("doc",doc);
            // });