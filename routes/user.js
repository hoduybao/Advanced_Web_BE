const router = require('express').Router()
const ctrls = require('../controllers/user')
const { verifyAccessToken } = require('../middlewares/verifyToken')
const uploader = require('../config/cloudinary.config')
const asyncHandler = require('express-async-handler')


router.post('/register', ctrls.register);
router.get('/verify-email', ctrls.verifyEmail);
router.post('/reset-password', ctrls.resetPassword);
router.post('/forget-password', ctrls.forgetPassword);
router.post('/login', ctrls.login);
router.get('/current', verifyAccessToken, ctrls.getCurrent)
router.put('/update', [verifyAccessToken], uploader.single('avatar'), ctrls.updateUser);


module.exports = router