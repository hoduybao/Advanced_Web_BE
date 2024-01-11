const express = require("express");
require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const passport = require("passport")
const passportSetup = require("./middlewares/passport")
const initRoutes = require("./routes");
const { Server } = require('socket.io')

const app = express();
const httpServer = require("http").Server(app); // Create an HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL_LOCALHOST],
  },
});
const port = process.env.PORT || 8888;

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_LOCALHOST, process.env.CLIENT_ADMIN],
    methods: ["POST", "PUT", "GET", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(cookieSession(
  {
    name: 'session',
    keys: ['lama'],
    maxAge: 24 * 60 * 60 * 100
  }
))
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dbConnect();

initRoutes(app);

httpServer.listen(port, () => {
  console.log("Server running " + port);
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
  });
});

// Expose the Socket.IO instance to the routes
app.set("io", io);
