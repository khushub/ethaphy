const mongoose =  require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
   username : { type : String, required : true, index : true },     //username

   email : { type : String, required : true, unique : true,  index : true },        //email

   mobileNo : {type : String},

   password : { type: String },     // admin/counserller/user/

   role : { type : String},         // admin/counserller/user/

   status : {type : String},        // active/inactive

   feeling : {type : String},

   challenge : {type : Array},

   arealife : { type : Array},

   description : {type : String},

   sucideattempt : { type : Boolean},

   counsellingattempt : {type : String},

   age : {type : String},

   country : {type : String},

   state : { type : String},

   relationshipstatus : {type : String},

   genderidentity : { type : String},

   sexualorientation : {type : String},

   religousspitual : {type : String},

   painorillness : {type : Boolean},

   medicinestatus : {type : Boolean},

   ready : {type : Boolean},

   deleted : {type : Boolean}

} , {timestamps :true});

userSchema.methods.setDefaults = function(){
	this.role = 'user';
	this.status = 'active';
};

userSchema.index({role:1,deleted: -1});
module.exports = mongoose.model('User', userSchema);