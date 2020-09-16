const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// User details
const questionSchema = new Schema({
    feeling:	{type : Array},
    
    challenge:	{type : Array},	
    
    arealife:	{type : Array},	
    				
    age:		{type : Array},	
    
    country:	{type : Array},	
    
    state:		{type : Array},	
    
    relationshipstatus:	{type : Array},
    
    genderidentity:	{type : Array},
    
    sexualorientation:	{type : Array},
    
    religousspitual:	{type : Array},
    
	deleted:	{type : Boolean},		// true/false

}, {timestamps: true});

questionSchema.methods.setDefaults = function(){

};
questionSchema.index({deleted: -1});

module.exports = mongoose.model('Question', questionSchema);