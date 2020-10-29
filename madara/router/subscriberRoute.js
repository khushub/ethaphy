const router = require('express').Router();
const subscriber = require('../handlers/subscriberHandler');

router.post('/', subscriber.subscribePlan);


module.exports = router;