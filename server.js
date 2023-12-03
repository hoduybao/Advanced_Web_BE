const express = require("express");
require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const cookieParser = require("cookie-parser");
const initRoutes = require("./routes");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 8888;

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_LOCALHOST],
    methods: ["POST", "PUT", "GET", "DELETE"],
  })
);

app.use(cookieParser());

//doc data kieu json
app.use(express.json());
//doc data kieu array , object,...
app.use(express.urlencoded({ extended: true }));
dbConnect();

initRoutes(app);

app.listen(port, () => {
  console.log("Server running");
});
