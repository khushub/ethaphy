const Cricket = require('../models/cricketModel');

function updateCricData(){
    try {
        console.log("this function running");
        setInterval(() => {
            Cricket.updateMany({}, {$inc : {gameStart : 1, gameplay : 1, inning : 1}})
            setInterval(() => {
                Cricket.updateMany({}, {$inc : {ball : 1}})
            }, 10000); 
        }, 64000);      
    } 
    catch (error) {
        
    }
}

setInterval(updateCricData, 1000);
