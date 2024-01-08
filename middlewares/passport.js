var GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport")
const User = require("../model/user");


function initializePassport(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      function (accessToken, refreshToken, profile, email, done) {
        done(null, {
          profile: profile,
          email: email
        });
      }
    )
  );


  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async function (email, password, done) {
      try {
        // Xác thực tại đây, sử dụng Promises
        const user = await User.findOne({ email: email });

        if (!user) {
          return done(null, false, { message: 'Incorrect email.' });
        }


        if (! await user.isCorrectPassword(password)) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // Lưu thông tin user vào session
  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  // Lấy thông tin user từ session
  passport.deserializeUser(async function (id, done) {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

module.exports = initializePassport;