const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const status = new Schema({
    active : {type : Number},

    canceled : {type : Number},

    missed : {type : Number},

    booked : {type : Number},
});

module.exports = mongoose.model('Status', status);