const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const otpSchema = new Schema({
    otp : {
        type : String
    },

    email : {
        type : {type : String}
    }
});

module.exports = mongoose.model('OTP',otpSchema );
