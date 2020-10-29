const router = require('express').Router();
const stripePlan = require('../handlers/stripePlan');

router.post('/monthly', stripePlan.createMonthlyPlans);

router.post('/weekly', stripePlan.createWeeklyPlans);

module.exports = router;