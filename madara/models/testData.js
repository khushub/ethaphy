const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const testData = new Schema({
    username : {
        type : String
    },

    data : {
        type : {type : String}
    }
});

module.exports = mongoose.model('Test',testData );
