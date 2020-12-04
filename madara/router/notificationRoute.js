const router = require('express').Router();
const notificationHandler = require('../handlers/notification');

router.post('/ios', notificationHandler.sendIOSNotification);

router.post('/android', notificationHandler.sendAndroidNotification);

router.post('/agoraToken/:token', notificationHandler.generateAgoraToken);

module.exports = router;