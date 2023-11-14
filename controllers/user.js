const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");

const register = asyncHandler(async (req, res) => {
  const { fullname, email, mobile, password } = req.body;

  if (!email || !password || !fullname || !mobile)
    return res.status(400).json({
      success: false,
      message: "Missing inputs!",
    });
   const findEmail = await User.findOne({ email });

   if (findEmail) throw new Error("User has existed!");

   else{
    const response=await User.create(req.body)
    return res.status(200).json({
     success:response?true:false,
     message: response ? "Register is successfully." : "Something went wrong",
    })
   }

  
});

const login =asyncHandler(async(req,res)=>{
   const {email,password} =req.body;

   if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing inputs",
    });


  }

  const response = await User.findOne({ email });
  
  if (response && (await response.isCorrectPassword(password))) {
    const { password, refreshToken, ...userData } = response.toObject();
    const accessToken = generateAccessToken(response._id);
    const newRefreshToken = generateRefreshToken(response._id);

    //Lưu refresh token vào db
    await User.findByIdAndUpdate(response._id, { refreshToken : newRefreshToken}, { new: true });

    //Lưu refresh token vào cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      accessToken,
      userData,
    });
  } else {
    throw new Error("Invalid credentials!");
  }



})


module.exports={
    register,
    login
}
