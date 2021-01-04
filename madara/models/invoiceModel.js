const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const invoiceModel = new Schema({
    userId : { type : String },
    
    invoices : { type : Array }


});

module.exports = mongoose.model('StripeModel', invoiceModel);