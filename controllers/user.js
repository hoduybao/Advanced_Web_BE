const User = require("../model/user");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
require('dotenv').config();

const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
})

const register = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;

  const user = new User({
    fullname,
    email,
    password,
    emailToken: crypto.randomBytes(64).toString('hex'),
    verified: false
  })


  if (!email || !password || !fullname)
    return res.status(400).json({
      success: false,
      message: "Missing inputs!",
    });



  //send verification mailto user
  var mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: user.email,
    subject: 'Verify your email',
    html: `<h2> ${user.fullname}! Thanks for registering on our site </h2>
          <h4> Please verify your mail to continue...</h4>
          <a href="http://${req.headers.host}/api/user/verify-email?token=${user.emailToken}">Verify</a>
    `
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    }
  })

  const findEmail = await User.findOne({ email });

  if (findEmail) throw new Error("Email has existed!");

  else {
    const newUser = await user.save();
    return res.status(200).json({
      success: newUser ? true : false,
      message: newUser ? "Register successfully. Please check your email to verify your account!" : "Email has existed!",
    })
  }

});

const verifyEmail = async (req, res) => {
  const token = req.query.token;
  const user = await User.findOne({ emailToken: token })
  if (user) {
    user.emailToken = null;
    user.verified = true;
    const verify = await user.save();
    return res.status(200).json({
      success: verify ? true : false,
      message: verify ? "Verify your account successfully!" : "Can not verify your account",
    })
  }
};

function generateRandomPassword() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters.charAt(randomIndex);
  }

  return password;
}

const resetPassword = async (req, res) => {
  const { _id } = req.user;

  const { password, newpassword } = req.body;

  if (!_id || !password || !newpassword) {
    return res.status(400).json({
      success: false,
      message: "Missing inputs",
    });
  }

  const user = await User.findById(_id);

  if (user) {
    if (await user.isCorrectPassword(password)) {
      user.password = newpassword;
      const response = await user.save();
      return res.status(200).json({
        success: true,
        message: "Change password successfully!",
      })
    } else {
      return res.status(200).json({
        success: false,
        message: "Incorrect old password!",
      })
    }
  }
};


const forgetPassword = async (req, res) => {
  const { email }= req.body;

  const user = await User.findOne({ email: email })

  const password = generateRandomPassword();

  if (user) {

    //send verification mailto user
    var mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: user.email,
      subject: 'Forget your password',
      html: `<h2>Hello ${user.fullname}!</h2>
          <h3>You have just requested a password reset for our website.</h3>
          <h4>Your new password is: ${password}</h4>`
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      }
    })

    user.password = password;
    const response = await user.save();
    return res.status(200).json({
      success: true,
      message: "A new password has been sent to your email!",
    })
  } else {
    return res.status(200).json({
      success: false,
      message: "Email is not exist!!!",
    })
  }
};


const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing inputs",
    });
  }

  const response = await User.findOne({ email });

  if (response) {
    if (response.verified) {
      if (await response.isCorrectPassword(password)) {
        const { password, refreshToken, ...userData } = response.toObject();
        const accessToken = generateAccessToken(response._id);
        const newRefreshToken = generateRefreshToken(response._id);

        //Lưu refresh token vào db
        await User.findByIdAndUpdate(response._id, { refreshToken: newRefreshToken }, { new: true });

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
        throw new Error("Log in failed! Incorrect password.");
      }
    }
    else {
      throw new Error("Log in failed! Your account is not activated, please verify account!");
    }
  } else {
    throw new Error("Log in failed! Email not existed!");
  }

})

const getCurrent = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  const user = await User.findById(_id).select("-refreshToken -password");

  return res.status(200).json({
    success: user ? true : false,
    userData: user ? user : "User not found",
  });
});


const updateUser = asyncHandler(async (req, res) => {

  const { _id } = req.user;
  if (!_id || Object.keys(req.body).length === 0)
    throw new Error('Missing inputs')

  if (req.file) {
    req.body.avatar = req.file.path;
  }


  const response = await User.findByIdAndUpdate(_id, req.body, { new: true }).select('-password -refreshToken')


  return res.status(200).json({
    success: response ? true : false,
    userData: response ? response : 'Something went wrong'
  })
})




module.exports = {
  register,
  login,
  getCurrent,
  updateUser,
  verifyEmail,
  resetPassword,
  forgetPassword
}
