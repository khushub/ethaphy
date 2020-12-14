// required modules
var mongoose = require('mongoose');
var logger = require('log4js').getLogger();
var Chat = mongoose.model('Chat');

//
// Helper Functions
//

module.exports.createMessage = function (io, socket, request) {
  if (!request) return;
  var chat = new Chat();
  chat.user_id = request.user_id;
  chat.username = request.username;
  chat.counsellor_id = request.counsellor_id;
  chat.counsellorname = request.counsellorname;
  chat.joinId = request.joinId;
  chat.message_type = request.message_type;
  chat.message = request.message;
  chat.type = request.type;
  chat.id = request.id;
  chat.time = new Date();
  console.log("aaaa");

  chat.save(function (err) {
    console.log(err);
    Chat.find({ 'joinId': request.joinId, user_id: request.user_id }).sort({ "time": -1 }).exec(function (err, message) {
      if (err) logger.debug(err);
      if (message) {
        socket.emit("get-message-success", { message: message });
      }
      else {
        socket.emit("get-message-success", { message: [] });
      }
    });
  });


}

module.exports.createMessageCounseller = function (io, socket, request) {
  if (!request) return;
  var chat = new Chat();
  chat.user_id = request.user_id;
  chat.username = request.username;
  chat.counsellor_id = request.counsellor_id;
  chat.counsellorname = request.counsellorname;
  chat.message_type = request.message_type;
  chat.joinId = request.joinId;
  chat.message = request.message;
  chat.id = request.id;
  chat.type = request.type;
  chat.time = new Date();


  chat.save(function (err) {

    Chat.find({ 'joinId': request.joinId, counsellor_id: request.counsellor_id }).sort({ "time": -1 }).exec(function (err, message) {
      if (err) logger.debug(err);
      if (message) {
        socket.emit("get-message-counsellor-success", { message: message });
      }
      else {
        socket.emit("get-message-counsellor-success", { message: [] });
      }
    });
  });


}

module.exports.joinChat = function (io, socket, request) {
  if (!request) return;



  Chat.find({ 'joinId': request.joinId, user_id: request.user_id }).sort({ "time": -1 }).exec(function (err, message) {
    if (err) logger.debug(err);
    if (message) {
      socket.emit("get-message-success", { message: message });
    }
    else {
      socket.emit("get-message-success", { message: [] });
    }


  });



}


module.exports.joinChatCounseller = function (io, socket, request) {
  if (!request) return;



  Chat.find({ 'joinId': request.joinId, counsellor_id: request.counsellor_id }).sort({ "time": -1 }).exec(function (err, message) {
    if (err) logger.debug(err);
    if (message) {
      socket.emit("get-message-counsellor-success", { message: message });
    }
    else {
      socket.emit("get-message-counsellor-success", { message: [] });
    }


  });



}



