const mongoose =  require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
   user_id : { type : String},     //username
   username : { type : String},     //username
   counsellor_id : { type : String},     //username
   counsellorname : { type : String},     //username
   joinId : { type : String},     //username
   message : { type : String },        //message
   fileupload : { type : String },        //fileupload
   message_type  : { type : String },        //fileupload
   time : {type : Date},
   type: { type : String }, 
   id: { type : String }, 

} , {timestamps :true});


module.exports = mongoose.model('Chat', chatSchema);