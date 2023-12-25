const router = require("express").Router();
const ctrls = require("../controllers/grade_review");
const { verifyAccessToken } = require("../middlewares/verifyToken");

router.post("/post-grade-review", [verifyAccessToken], ctrls.PostGradeReviewFromStudent);
router.get("/get-all-review/:slugClass", [verifyAccessToken], ctrls.ViewGradeReviews);


module.exports = router;
