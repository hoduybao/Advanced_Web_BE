const router = require("express").Router();
const ctrls = require("../controllers/user");
const { verifyAccessToken } = require("../middlewares/verifyToken");
const uploader = require("../config/cloudinary.config");


router.get("/verify-email", ctrls.verifyEmail);
router.get("/current", verifyAccessToken, ctrls.getCurrent);
router.post("/reset-password", [verifyAccessToken], ctrls.resetPassword);
router.post("/forget-password", ctrls.forgetPassword);
router.post("/login", ctrls.login);
router.post("/register", ctrls.register);
router.post("/loginAdmin", ctrls.loginAdmin);

router.put(
  "/update",
  [verifyAccessToken],
  uploader.single("avatar"),
  ctrls.updateUser
);

module.exports = router;
