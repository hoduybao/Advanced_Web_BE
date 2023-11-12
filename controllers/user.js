const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const register = asyncHandler(async (req, res) => {
  const { fullname, email, mobile, password } = req.body;

  if (!email || !password || !fullname || !mobile)
    return res.status(400).json({
      success: false,
      message: "Missing inputs!",
    });

   const response=await User.create(req.body)
   return res.status(200).json({
    success:true,
    response
   })
});

module.exports={
    register
}
