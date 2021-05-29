const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const counselorToUser = new Schema({
    counselorId : { type : String},

    userId : { type : String},

    slots : {type : Object},

    date : {type : String}
    
}, {timestamps : true});

module.exports = mongoose.model('CounselorToUser', counselorToUser);