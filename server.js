import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const server = createServer(app);

// Allow CORS for frontend
const io = new Server(server, {
  cors: {
    origin: "*", // Replace * with your frontend URL in production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// MongoDB Schema & Model
const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

// Root route
app.get("/", (req, res) => {
  res.send("✅ Chat backend is running");
});

// Fetch chat history
app.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Real-time chat with Socket.IO
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join user
  socket.on("join", (username) => {
    socket.username = username;
    console.log(`👤 ${username} joined`);
  });

  // Send message
  socket.on("sendMessage", async (msg) => {
    try {
      const newMsg = new Message(msg);
      await newMsg.save();
      io.emit("receiveMessage", msg); // broadcast to all clients
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 ${socket.username || "User"} disconnected`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
