const mongoose = require('mongoose');
// const User  = require('./userModel');

const Schema = mongoose.Schema;

const otpSchema = new Schema({
    otp : {
        type : Number
    },

    email : {
        type : {type : Schema.Types.ObjectId  , ref : 'User'}
    }
});

module.exports = mongoose.model('OTP',otpSchema );
