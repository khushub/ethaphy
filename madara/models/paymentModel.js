const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId : { type : String},
    stripeUserId : {type : String},
    email : {type :  String},
    cardDetails : {type : Object},
    paymentToken : {type : String}
});

module.exports = mongoose.model('Payment', paymentSchema);