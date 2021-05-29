const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const counselorPayment = new Schema({
    counselorId : { type : String },

    userId : { type : String},

    counsellorname : { type : String},

    username : { type : String},

    payment : { type : Array}
});

module.exports = mongoose.model('counselorPayment', counselorPayment);