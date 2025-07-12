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
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, "users.json");

function getUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 🔐 LOGIN
app.get("/", (req, res) => {
  if (req.session.username) {
    let chatHtml = fs.readFileSync(path.join(__dirname, "chat.html"), "utf-8");
    chatHtml = chatHtml.replace("{{USERNAME}}", req.session.username);
    return res.send(chatHtml);
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// REGISTER PAGE
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "register.html"));
});

// REGISTER ACTION
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect("/register");

  const users = getUsers();
  if (users[username]) return res.send("Efa misy io anaranao io");

  users[username] = password;
  saveUsers(users);

  req.session.username = username;
  res.redirect("/");
});

// LOGIN ACTION
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  if (users[username] && users[username] === password) {
    req.session.username = username;
    return res.redirect("/");
  }
  res.send("Diso anarana na tenimiafina!");
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
