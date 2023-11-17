const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");

const register = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!email || !password || !fullname)
    return res.status(400).json({
      success: false,
      message: "Missing inputs!",
    });
   const findEmail = await User.findOne({ email });

   if (findEmail) throw new Error("Email has existed!");

   else{
    const response=await User.create(req.body)
    return res.status(200).json({
     success:response?true:false,
     message: response ? "Register is successfully." : "Email has existed!",
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

const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const user = await User.findById(_id).select("-refreshToken -password");

  return res.status(200).json({
    success: user? true:false,
    userData: user ? user : "User not found",
  });
});
const updateUser= asyncHandler(async(req,res)=>{

  const {_id}=req.user;

  if(!_id || Object.keys(req.body).length===0)
  throw new Error('Missing inputs')
   
  req.body.avatar=req.file.path;

 const response =await User.findByIdAndUpdate(_id,req.body,{new:true}).select('-password -refreshToken')


  return res.status(200).json({
    success:response?true:false,
    updatedUser: response ? response :'Something went wrong'
  })
})

const uploadImagesProduct = asyncHandler (async(req,res)=>{

  const {pid}=req.params;
  if(!req.files) throw new Error('Missing inputs');
  const response= await Product.findByIdAndUpdate(pid, {
    $push: {images:{$each: req.files.map(el=>el.path)}}
  },{new:true})
  return res.status(200).json({
    status: response?true: false,
    updatedProduct: response ? response : 'Cannot upload images product',
  })
})


module.exports={
    register,
    login,
    getCurrent,
    updateUser
}
