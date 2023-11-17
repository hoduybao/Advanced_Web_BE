const router =require('express').Router()
const ctrls=require('../controllers/user')
const {verifyAccessToken}=require('../middlewares/verifyToken')
const uploader=require('../config/cloudinary.config')


router.post('/register',ctrls.register);
router.post('/login',ctrls.login);
router.get('/current',verifyAccessToken,ctrls.getCurrent)
router.put('/update',[verifyAccessToken], uploader.single('avatar') ,ctrls.updateUser);


module.exports=router