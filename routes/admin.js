const router = require("express").Router();
const ctrls = require("../controllers/admin");
const { verifyAccessToken } = require("../middlewares/verifyToken");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/getAllUser", [verifyAccessToken], ctrls.getAllUsers);
router.get("/getDetailUser/:userId", [verifyAccessToken], ctrls.getDetailUser);
router.put('/update-details-user', [verifyAccessToken], ctrls.UpdateUsersDetails);
router.put('/toggle-status-user/:userId', [verifyAccessToken], ctrls.toggleAccountStatus);

router.get("/getAllClass", [verifyAccessToken], ctrls.getAllClasses);
router.get("/getDetailClass/:classId", [verifyAccessToken], ctrls.getDetailClass);
router.put('/toggle-status-class/:classId', [verifyAccessToken], ctrls.toggleClassStatus);
router.get("/download-data-user-email", [verifyAccessToken], ctrls.DownloadCsvDataUserWithEmail);
router.post("/upload-map-studentId", upload.single('file'), [verifyAccessToken], ctrls.uploadCsvFileToMapStudentID);





module.exports = router;