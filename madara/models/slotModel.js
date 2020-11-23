const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const slotSchema = new Schema({
    counselorId : {type : String},
    date : {type : Date},
    status : {type : String, default : 'active'},
    slot : [
        {
            time : {type : String},
            status : {type : String, default : 'active'}
        }
    ]
});

module.exports = mongoose.model('Slot', slotSchema);



// slot : [
//     {
//         date : { type : Date},
//         time : { type : Array},
//         status : { type : String, default : 'active'}
//     }
// ]