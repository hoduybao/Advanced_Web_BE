const router = require("express").Router();
const ctrls = require("../controllers/admin");
const { verifyAccessToken } = require("../middlewares/verifyToken");


router.get("/getAllUser", [verifyAccessToken], ctrls.getAllUsers);
router.get("/getDetailUser/:userId", [verifyAccessToken], ctrls.getDetailUser);
router.put('/update-details-user', [verifyAccessToken], ctrls.UpdateUsersDetails);
router.put('/toggle-status-user/:userId', [verifyAccessToken], ctrls.toggleAccountStatus);

router.get("/getAllClass", [verifyAccessToken], ctrls.getAllClasses);
router.get("/getDetailClass/:classId", [verifyAccessToken], ctrls.getDetailClass);



module.exports = router;