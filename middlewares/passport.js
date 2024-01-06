var GoogleStrategy = require("passport-google-oauth20").Strategy;
//const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport")

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

//Dữ liệu ở serializeUser trả về và lưu vào session.passport
passport.serializeUser(function (user, done) {
  done(null, user);
});

//Dữ liệu ở deserializeUser trả về và lưu vào req.user
passport.deserializeUser(function (user, done) {
  console.log("deserializeUser", user);
  done(null, user);
});
