const router = require('express').Router();
const notificationHandler = require('../handlers/notification');

router.post('/ios', notificationHandler.sendIOSNotification);

router.post('/android', notificationHandler.sendAndroidNotification);

router.post('/agoraToken/:token', notificationHandler.generateAgoraToken);

router.post('/web/call', notificationHandler.webCall);

router.post('/web/deleteToken', notificationHandler.deleteAgoraToken);

module.exports = router;