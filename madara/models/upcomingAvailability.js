const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const upcomingAvailability = new Schema({
    counselorId : { type : String},

    availability : { type : Array}

}, {timestamps : true}
);

module.exports = mongoose.model('upcoming-availability', upcomingAvailability);