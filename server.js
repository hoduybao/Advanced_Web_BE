const express = require("express");
require("dotenv").config();
const dbConnect = require("./config/dbConnect");

const cors = require("cors");

const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const passport=require("passport")
const passportSetup=require("./middlewares/passport")

const initRoutes = require("./routes");


const app = express();
const port = process.env.PORT || 8888;

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_LOCALHOST],
    methods: ["POST", "PUT", "GET", "DELETE"],
    credentials:true,
  })
);

app.use(cookieParser());
app.use(cookieSession(
    {
        name:'session',
        keys: ['lama'],
        maxAge: 24*60*60*100
    }
))
app.use(passport.initialize());
app.use(passport.session());

//doc data kieu json
app.use(express.json());
//doc data kieu array , object,...
app.use(express.urlencoded({ extended: true }));
dbConnect();

initRoutes(app);

app.listen(port, () => {
  console.log("Server running");
});
