// required module
const {RtcTokenBuilder, RtcRole}  = require('agora-access-token');
const apn = require('apn');
// const fcm = new FCM(serverkey);
// const FCM = require('fcm-node');
const jwt = require('jsonwebtoken');

const admin = require('firebase-admin');
// const serverkey = require('../../privateKey.json');

// required model
const Counselor = require('../models/counselorModel');
const User = require('../models/userModel');


// const firebaseApp = admin.initializeApp({
//     credential : admin.credential.cert(serverkey)
// });

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
        let senderName;
        let receiverName;
        if (!channel || !receiverId || !receiverRole) {
            return res.send({ error: 'field is missing, either channel/receiverId/receiverRole' });
        }

        else {
            if (receiverRole === 'user') {
                await User.findById(receiverId)
                    .then(doc => {
                        fcmToken = doc.fcmToken;
                        receiverName = doc.nickName
                        console.log("user fcm token: ", fcmToken);
                    })
                    .catch(error => {
                        return res.send({ error, success: false, message: "DB fetch error for user device token" });
                    });
                    await Counselor.findById(senderId)
                    .then(doc=>{
                        senderName = doc.userName
                    })
                    .catch(error =>{
                        res.send({error, success : false, message : "DB error in search of counselor name"});
                    })
            }

            if (receiverRole === 'counselor') {
                await Counselor.findById(receiverId)
                    .then(doc => {
                        // console.log("counselor fcm token: ", doc.fcmToken);
                        fcmToken = doc.fcmToken;
                        receiverName = doc.userName
                    })
                    .catch(error => {
                        res.send({ error, success: false, message: "DB fetch error for counselor device token" });
                    })
                await User.findById(senderId)
                .then(doc =>{
                    senderName = doc.nickName;
                })
                .catch(error =>{
                    res.send({error, success : false, message : "DB error in search of user name"});
                })    
            }

            const key = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, userId, role, privilegeExpiredTs);

            if (!key) {
                res.send({ error: 'RTC token generation error' });
            }

            else {
                const notification_options = {
                    priority: "high",
                    timeToLive: 60 * 60 * 24
                  };


                const message = {
                    data: {
                        token: key,
                        typeOfCall,
                        channel,
                        senderId,
                        receiverId,
                        agoraAppId: appId,
                        senderName,
                        receiverName
                    }
                }
                console.log("messageing: ", message);
                admin.messaging().sendToDevice(fcmToken, message, notification_options)
                .then(response =>{
                    console.log("successfully send message: ", response);
                    let data = {
                        token: key,
                        typeOfCall,
                        channel,
                        senderId,
                        receiverId,
                        agoraAppId: appId,
                        senderName,
                        receiverName
                    }
                    res.send({data, success : true, message : "message send successfully"});
                })
                .catch(error =>{
                    console.log("error in sending push message: ",error);
                    res.send({error, success : false, message : "push send failed"});
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