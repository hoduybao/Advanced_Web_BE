const router = require("express").Router();
const ctrls = require("../controllers/class");
const { verifyAccessToken } = require("../middlewares/verifyToken");

router.get("/detail/:slugClass", [verifyAccessToken], ctrls.getAllInfo);
router.post("/create", [verifyAccessToken], ctrls.createNewClass);
router.get("/list-class", [verifyAccessToken], ctrls.getListClassOfUser);
router.get("/list-user/:slugClass", [verifyAccessToken], ctrls.getListUserOfClass);
router.post("/join/:invitationId", [verifyAccessToken], ctrls.joinClassByCode);
router.post("/join-class/:slugClass", [verifyAccessToken], ctrls.joinClassByLink);
router.post("/check/:slugClass", [verifyAccessToken], ctrls.checkUserInClass);
router.post("/invite", [verifyAccessToken], ctrls.inviteUserByMail);
router.get("/verify-invite", ctrls.verifyInvite);

router.post("/gradeStructure/:slug", [verifyAccessToken], ctrls.createOrUpdateGradeStructure);
router.put("/finalize-grade/:slugClass/:gradeID", [verifyAccessToken], ctrls.FinalizedGradeStructure);

module.exports = router;
