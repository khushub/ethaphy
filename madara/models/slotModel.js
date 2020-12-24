const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const slotSchema = new Schema({
    counselorId : {type : String},
    day : {type : String},
    date : {type : String},
    status : {type : String, default : 'active'},
    slot : {type : Array}
});

module.exports = mongoose.model('Slot', slotSchema);
