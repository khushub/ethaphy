// required module
const jwt  = require('jsonwebtoken');
const {RtcTokenBuilder, RtcRole}  = require('agora-access-token');

const appId = "970CA35de60c44645bbae8a215061b33";
const appCertificate = "5CFd2fd1755d40ecb72977518be15d3b";
const expirationTimeInSeconds = 3600
const role = RtcRole.PUBLISHER

module.exports.generateAgoraToken = (req, res) =>{
    try {
        let {userId} = jwt.decode(req.params.token);
        let channel = "7d72365eb983485397e3e3f9d460bdda" || req.body.channel;
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
            res.send({token : key, success : true, message : "Token generation success"})
        }  
    } 
    catch (error) {
        res.send({error : error, success : false, message : "Something went wrong while rtc token generation"})
    }
}