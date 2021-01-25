const mongoose = require('mongoose');
const Schema  = mongoose.Schema;

const counselorSchema = new Schema({
    firstName : {type : String, required : true},

    lastName : {type : String, required : true},

    userName : {type : String, required : true, unique : true, index : true},

    email : {type : String, required : true, unique : true, index : true},

    mobileNumber : {type : String, required : true, unique : true},

    address : {type : String, required : true},

    password : {type : String, required : true},

    role : {type : String, default: 'counselor'},

    status : {type : String, default : 'inactive'},

    deleted : {type : Boolean},

    affirmation : {type : String, required : true},

    licensingState : {type : String, required : true},

    licenseNumber : {type : String, required : true},

    licenseLink : {type : String, required : true},

    licenseReview : {type : Boolean, required : true},

    serviceProviding : {type : Array, required : true},

    genderApplies : {type : String, required : true},

    languages : {type : Array, required: true},

    photo : {type : String, required : true},

    designations : {type : Array, required : true},

    specialities : {type : Array, required : true},

    aboutMe : {type: String, required : true},

    personalQuote : {type : String, required : true},

    practiceYears : {type : String, required : true},

    attendedSchool : {type : String, required : true},

    graduatedYear : {type : String, required : true},

    howYouhearAboutUs : {type : String, required : true},

    introMessage : {type : String},

    introVideo : {type : String},

    fcmToken : { type : String},

    files : { type : Array}

}, {timestamps : true});

counselorSchema.methods.setDefaults = function (){
    this.role = 'counselor';
    this.status  =  'inactive';
}

counselorSchema.index({role : 1, deleted : -1});

module.exports = mongoose.model('Counselor', counselorSchema);

