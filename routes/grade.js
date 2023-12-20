const router = require("express").Router();
const ctrls = require("../controllers/grade");
const { verifyAccessToken } = require("../middlewares/verifyToken");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/download-id-fullname/:slug", [verifyAccessToken], ctrls.DownloadStudentWithIdAndName);
router.get("/download-id/:slug", [verifyAccessToken], ctrls.DownloadStudentWithId);
router.post("/upload-grades/:slugClass/:gradeId", upload.single('file'), [verifyAccessToken], ctrls.UploadGradeAGradeStructure);
router.get("/getAllPoint/:slug", [verifyAccessToken], ctrls.getAllClassroomGrades);

router.get("/grade-student/:slugClass", [verifyAccessToken], ctrls.GetGradeAStudent);


module.exports = router;
