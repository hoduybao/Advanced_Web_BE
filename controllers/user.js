const User = require("../model/user");
const sendmail = require("../helpers/sendmail")
const generateRandom = require("../helpers/generateRandom");
const crypto = require("crypto");
require("dotenv").config();
const passport = require('passport');
const initializePassport = require('../middlewares/passport'); // Điều chỉnh đường dẫn đến file passport-config.js của bạn
initializePassport(passport);


const asyncHandler = require("express-async-handler");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");

const register = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;

  const user = new User({
    fullname,
    email,
    password,
    emailToken: crypto.randomBytes(64).toString("hex"),
    verified: false,
    typeLogin: "local",
  });

  if (!email || !password || !fullname)
    return res.status(400).json({
      success: false,
      message: "Missing inputs!",
    });

  sendmail.sendmail(user.email,
    "Verify your email",
    `<h2>Hello ${user.fullname}! Thank you for registering on our website!</h2>
          <h4>To activate your account, please <a href="http://${req.headers.host}/api/user/verify-email?token=${user.emailToken}">click here</a></h4>        
    `);

  const findEmail = await User.findOne({ email });

  if (findEmail) throw new Error("Email has existed!");
  else {
    const newUser = await user.save();
    return res.status(200).json({
      success: newUser ? true : false,
      message: newUser
        ? "Register successfully. Please check your email to verify your account!"
        : "Email has existed!",
    });
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  const user = await User.findOne({ emailToken: token });

  if (!user) {
    // Handle the case where the user with the provided token is not found
    return res.status(404).send(`
      <html>
        <head>
          <title>Email Verification Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .content {
              text-align: center;
              border: 2px solid #ccc; /* Thêm border 2px với màu xám nhạt */
              padding: 20px; /* Thêm padding để tạo khoảng cách từ border đến nội dung */
              border-radius: 10px; /* Thêm border-radius để bo tròn các góc */
            }
            h1 {
              color: red;
            }
          </style>
        </head>
        <body>
          <div class="content">
            <h1>Email verification failed</h1>
            <p>Invalid token.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Update user's verification status
  user.verified = true;
  user.emailToken = undefined; // Clear the emailToken

  await user.save();

  // Respond with an HTML page indicating successful verification
  res.status(200).send(`
  <html>
    <head>
      <title>Email Verification Successful</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .content {
          text-align: center;
          border: 2px solid #ccc; /* Thêm border 2px với màu xám nhạt */
          padding: 20px; /* Thêm padding để tạo khoảng cách từ border đến nội dung */
          border-radius: 10px; /* Thêm border-radius để bo tròn các góc */
        }
        h1 {
          color: green;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <h1>Email Verification Successful</h1>
        <p>Your email has been successfully verified. You can now log in to your account.</p>
      </div>
    </body>
  </html>
`);
});

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
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Incorrect old password!",
      });
    }
  }
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email });

  const password = generateRandom.generateRandom(6);

  if (user) {

    sendmail.sendmail(user.email,
      "Forget your password",
      `<h2>Hello ${user.fullname}!</h2>
          <h3>You have just requested a password reset for our website.</h3>
          <h4>Your new password is: ${password}</h4>`);

    user.password = password;
    const response = await user.save();

    return res.status(200).json({
      success: true,
      message: "A new password has been sent to your email!",
    });
  } else {
    return res.status(200).json({
      success: false,
      message: "Email is not exist!!!",
    });
  }
};

const login = asyncHandler(async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (user.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Account is locked, please contact to admin!"
      });
    }

    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: "Account is not verified, please verify email!"
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: info.message || 'Authentication failed',
      });
    }

    req.login(user, async (err) => {
      if (err) {
        return next(err);
      }

      const { password, refreshToken, ...userData } = user.toObject();
      const accessToken = generateAccessToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // Lưu refresh token vào db
      try {
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { refreshToken: newRefreshToken },
          { new: true }
        );

        // Lưu refresh token vào cookie
        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          accessToken,
          userData,
        });
      } catch (err) {
        return next(err);
      }
    });
  })(req, res, next);
});


const loginGoogle = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
    });
  }
  const user = await User.findOne({
    email: req.user.email.emails[0].value,
    typeLogin: "google",
  });

  const newUser = {
    fullname: req.user.email.displayName,
    email: req.user.email.emails[0].value,
    password: "google",
    verified: true,
    typeLogin: "google",
  };

  if (!user) {
    const response = await User.create(newUser);
    if (response) {
      const { password, refreshToken, ...userData } = response.toObject();
      const accessToken = generateAccessToken(response._id);
      const newRefreshToken = generateRefreshToken(response._id);

      await User.findByIdAndUpdate(
        response._id,
        { refreshToken: newRefreshToken },
        { new: true }
      );

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
    }
  } else {
    const { password, refreshToken, ...userData } = user.toObject();
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    //Lưu refresh token vào db
    await User.findByIdAndUpdate(
      user._id,
      { refreshToken: newRefreshToken },
      { new: true }
    );

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
  }


});
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
    throw new Error("Missing inputs");

  if (req.file) {
    req.body.avatar = req.file.path;
  }

  const response = await User.findByIdAndUpdate(_id, req.body, {
    new: true,
  }).select("-password -refreshToken");

  return res.status(200).json({
    success: response ? true : false,
    userData: response ? response : "Something went wrong",
  });
});

const loginAdmin = asyncHandler(async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (user.email != 'admin') {
      return res.status(400).json({
        success: false,
        message: "Incorrect username or password!"
      });
    }
    if (!user) {
      return res.status(400).json({
        success: false,
        message: info.message || 'Authentication failed',
      });
    }

    req.login(user, async (err) => {
      if (err) {
        return next(err);
      }

      const { password, refreshToken, ...userData } = user.toObject();
      const accessToken = generateAccessToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // Lưu refresh token vào db
      try {
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { refreshToken: newRefreshToken },
          { new: true }
        );

        // Lưu refresh token vào cookie
        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          accessToken,
          userData,
        });
      } catch (err) {
        return next(err);
      }
    });
  })(req, res, next);
});

module.exports = {
  register,
  login,
  getCurrent,
  updateUser,
  verifyEmail,
  resetPassword,
  forgetPassword,
  loginGoogle,
  loginAdmin
};
