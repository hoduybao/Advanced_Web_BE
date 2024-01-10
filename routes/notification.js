const router = require("express").Router();
const ctrls = require("../controllers/notification");
const { verifyAccessToken } = require("../middlewares/verifyToken");

router.get("/getAllNotify", [verifyAccessToken], ctrls.getAllNotify);
router.put('/mark-as-read/:notificationId', [verifyAccessToken], ctrls.markNotificationAsRead);
router.get('/mark-all-as-read', [verifyAccessToken], ctrls.markAllNotificationsAsRead);


module.exports = router;