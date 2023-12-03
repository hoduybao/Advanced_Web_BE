const passport=require("passport")
const router = require("express").Router();
const ctrls = require("../controllers/user");


router.get("/login/success",ctrls.loginGoogle)


router.get("/login/failed",(req,res)=>{
    res.status(401).json({
        success:false,
        message: 'failure'
    })
})

router.get("/logout",(req,res)=>{
    req.logout();
    res.redirect("http://localhost:3000/")

})
router.get('/google',passport.authenticate("google",{scope:["profile","email"]}))
router.get('/google/callback',passport.authenticate("google",{
    successRedirect:"http://localhost:3000/",
    failureRedirect: "/login/failed"
}))

module.exports = router;
