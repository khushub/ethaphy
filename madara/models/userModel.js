const mongoose =  require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
   username : { type : String, required : true, unique : true, index : true},     //username

   email : { type : String, required : true, unique : true,  index : true },        //email

   mobileNo : {type : String},

   password : { type: String },     // admin/counserller/user/

   role : { type : String, default : 'user'},         // admin/counserller/user/

   status : {type : String, default : 'inactive'},        // active/inactive

   feeling : {type : String},

   profilePhoto : {type : String},

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

   deleted : {type : Boolean, default : false},

   forgotPasswordToken : {type : String},

   cardDetails : { type :Object },

   address : { type : Object},

   stripeCustomerId : {type : String},

   subscriptionId : { type : String},

   trialCount : {type : Number, default : 0},

   fcmToken : { type : String},

   nickName : {type : String},

   cardDetails : { type : Object, default : null},

   creditCount : {type : Number, default : 0},

   counselorId : { type : String},

   joinId : { type : String},

   planExpireDate : { type : Number},

   planStartDate : { type : Number},

   isCanceled : { type : Boolean},

   priceId : { type : String}

} , {timestamps :true});

userSchema.methods.setDefaults = function(){
	this.role = 'user';
	this.status = 'inactive';
};

userSchema.index({role:1,deleted: -1});
module.exports = mongoose.model('User', userSchema);
