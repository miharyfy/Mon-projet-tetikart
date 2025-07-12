const express = require("express");
const path = require("path");
const http = require("http");
const fs = require("fs");
const socketIo = require("socket.io");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cookieParser());
app.use(session({
  secret: "mihchat-secret-key",
  resave: false,
  saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));  // static ho an'ny css sy js

app.get("/", (req, res) => {
  if (req.session.username) {
    let chatHtml = fs.readFileSync(path.join(__dirname, "chat.html"), "utf-8");
    chatHtml = chatHtml.replace("{{USERNAME}}", req.session.username);
    return res.send(chatHtml);
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", (req, res) => {
  const { username } = req.body;
  if (username && username.trim() !== "") {
    req.session.username = username.trim();
    return res.redirect("/");
  }
  res.redirect("/");
});

io.use((socket, next) => {
  const req = socket.request;
  const res = req.res;
  cookieParser()(req, res, () => {
    session({
      secret: "mihchat-secret-key",
      resave: false,
      saveUninitialized: true
    })(req, res, next);
  });
});

io.on("connection", (socket) => {
  const username = socket.request.session.username;
  if (!username) return socket.disconnect(true);

  socket.on("chat message", ({ text }) => {
    io.emit("chat message", { user: username, text });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 MihChat mandeha @ http://localhost:" + PORT));
