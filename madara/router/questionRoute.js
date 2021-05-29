const router = require('express').Router();
const userHandler = require('../handlers/user');
const Question = require('../models/questionModel');
const Status = require('../models/status');

router.get('/', userHandler.getQuestions);

router.get('/homeScreenVideos', (req, res) =>{
  try {
    const data =[
      {
          'id': 1,
          'url': "https://youtu.be/tyQ1ao5RHuM",
          'title' : 'title1',
          'content' : 'content1',
          'duration' : '2:01',
          'thumbnail' : 'https://api.kushubmedia.com/973195681.png'
      },
      {
          'id': 2,
          'name': "https://youtu.be/nGvC9bg95OI",
          'title' : 'title2',
          'content' : 'content2',
          'duration' : '2:21',
          'thumbnail' : 'https://api.kushubmedia.com/941504523.png'
      },
      {
          'id': 3,
          'name': "https://youtu.be/YHucPsVfzo8",
          'title' : 'title3',
          'content' : 'content3',
          'duration' : '1:00',
          'thumbnail' : 'https://api.kushubmedia.com/92210932.png'
      }
  ]
    res.send({data, success : true})  
  } 
  catch (error) {
    res.send({error, success : false});
  }
})

router.post('/postQuestion', (req, res) =>{
    try {
        const questions = new Question({
           feeling : req.body.feeling, 
           challenge : req.body.challenge, 
           arealife : req.body.arealife, 
           age : req.body.age, 
           country : req.body.country, 
           state : req.body.state, 
           relationshipstatus : req.body.relationshipstatus, 
           genderidentity : req.body.genderidentity, 
           sexualorientation : req.body.sexualorientation, 
           religousspitual : req.body.religousspitual 
        })

        questions.save().then(doc => res.send({doc, success : true}))
        .catch(error => res.send({error : error, message : "DB error"}));
    } 
    catch (error) {
      res.send({error : error, message : "DB error"})  ;
    }
});


router.post('/statusData', (req, res) =>{
  const status = new Status({
    active : req.body.active,
    canceled : req.body.canceled,
    missed : req.body.missed,
    booked : req.body.booked,
  });

  status.save()
  .then(doc =>{
    res.send({doc, message : "status saved"});
  })
  .catch(error =>{
    res.send({error, message :  "status data save error in db"});
  })
});


module.exports = router;