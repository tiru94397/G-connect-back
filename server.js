import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

// Schema
const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// REST endpoint to fetch history
app.get("/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: user1, receiver: user2 },
      { sender: user2, receiver: user1 }
    ]
  }).sort({ timestamp: 1 });
  res.json(messages);
});

// Real-time events
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // When a new user joins
  socket.on("join", (username) => {
    socket.username = username;
    console.log(`👤 ${username} joined the chat`);
  });

  // Handle sending message
  socket.on("sendMessage", async (msg) => {
    const newMsg = new Message(msg);
    await newMsg.save();
    io.emit("receiveMessage", msg); // broadcast
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.username || "User"} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
