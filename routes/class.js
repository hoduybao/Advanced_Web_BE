const router = require("express").Router();
const ctrls = require("../controllers/class");
const { verifyAccessToken } = require("../middlewares/verifyToken");


router.post("/create", [verifyAccessToken], ctrls.createNewClass);
router.get("/class-teaching", [verifyAccessToken], ctrls.getListClassRoleTeacher);
router.get("/class-joining", [verifyAccessToken], ctrls.getListClassRoleStudent);
router.get("/list-user/:slugClass", [verifyAccessToken], ctrls.getListUserOfClass);
router.post("/join/:invitationId", [verifyAccessToken], ctrls.joinClassByCode);
router.post("/join/class/:slugClass", [verifyAccessToken], ctrls.joinClassByLink);
router.post("/check/:slugClass", [verifyAccessToken], ctrls.checkUserInClass);
router.post("/invite", [verifyAccessToken], ctrls.inviteUserByMail);
router.get("/verify-invite", ctrls.verifyInvite);

module.exports = router;
