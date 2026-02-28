import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "db");

function readDB(file: string) {
  const filePath = path.join(DB_PATH, file);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeDB(file: string, data: any) {
  const filePath = path.join(DB_PATH, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth API
  app.post("/api/register", (req, res) => {
    const { username, password, emoji } = req.body;
    const users = readDB("users.json");
    if (users.find((u: any) => u.username === username)) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }
    const newUser = { 
      id: Date.now().toString(), 
      username, 
      password, 
      emoji: emoji || "🤖", 
      status: "Привет, я в Robochat!",
      stickers: []
    };
    users.push(newUser);
    writeDB("users.json", users);
    res.json(newUser);
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const users = readDB("users.json");
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: "Неверные данные" });
    res.json(user);
  });

  app.post("/api/delete-account", (req, res) => {
    const { userId } = req.body;
    let users = readDB("users.json");
    users = users.filter((u: any) => u.id !== userId);
    writeDB("users.json", users);
    res.json({ success: true });
  });

  app.post("/api/update-profile", (req, res) => {
    const { userId, emoji, status, username } = req.body;
    const users = readDB("users.json");
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    
    if (emoji) users[userIndex].emoji = emoji;
    if (status !== undefined) users[userIndex].status = status;
    if (username) users[userIndex].username = username;
    
    writeDB("users.json", users);
    res.json(users[userIndex]);
  });

  // Messages API
  app.get("/api/messages", (req, res) => {
    res.json(readDB("messages.json"));
  });

  app.post("/api/messages", (req, res) => {
    const { from, to, text, image, type, groupId } = req.body;
    const messages = readDB("messages.json");
    const newMessage = {
      id: Date.now().toString(),
      from,
      to,
      groupId,
      text,
      image,
      type: type || "text",
      timestamp: Date.now(),
      reactions: {},
      pinned: false
    };
    messages.push(newMessage);
    writeDB("messages.json", messages);
    res.json(newMessage);
  });

  app.post("/api/messages/delete", (req, res) => {
    const { messageId } = req.body;
    let messages = readDB("messages.json");
    messages = messages.filter((m: any) => m.id !== messageId);
    writeDB("messages.json", messages);
    res.json({ success: true });
  });

  app.post("/api/messages/react", (req, res) => {
    const { messageId, userId, reaction } = req.body;
    const messages = readDB("messages.json");
    const msg = messages.find((m: any) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      msg.reactions[userId] = reaction;
      writeDB("messages.json", messages);
    }
    res.json(msg);
  });

  app.post("/api/messages/pin", (req, res) => {
    const { messageId, pinned } = req.body;
    const messages = readDB("messages.json");
    const msg = messages.find((m: any) => m.id === messageId);
    if (msg) {
      msg.pinned = pinned;
      writeDB("messages.json", messages);
    }
    res.json(msg);
  });

  // Groups API
  app.get("/api/groups", (req, res) => {
    res.json(readDB("groups.json"));
  });

  app.post("/api/groups", (req, res) => {
    const { name, creatorId, isPrivate, code, emoji } = req.body;
    const groups = readDB("groups.json");
    const newGroup = {
      id: "g" + Date.now().toString(),
      name,
      creatorId,
      isPrivate,
      code,
      emoji: emoji || "👥",
      members: [creatorId]
    };
    groups.push(newGroup);
    writeDB("groups.json", groups);
    res.json(newGroup);
  });

  app.post("/api/groups/join", (req, res) => {
    const { groupId, userId, code } = req.body;
    const groups = readDB("groups.json");
    const group = groups.find((g: any) => g.id === groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.isPrivate && group.code !== code) {
      return res.status(403).json({ error: "Неверный код доступа" });
    }
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      writeDB("groups.json", groups);
    }
    res.json(group);
  });

  // Contacts API
  app.get("/api/users", (req, res) => {
    const users = readDB("users.json");
    res.json(users.map((u: any) => ({ id: u.id, username: u.username, emoji: u.emoji, status: u.status })));
  });

  // Stickers API
  app.get("/api/stickers", (req, res) => {
    res.json(readDB("stickers.json"));
  });

  app.post("/api/stickers", (req, res) => {
    const { userId, stickerUrl } = req.body;
    const stickers = readDB("stickers.json");
    const newSticker = { id: Date.now().toString(), userId, url: stickerUrl };
    stickers.push(newSticker);
    writeDB("stickers.json", stickers);
    res.json(newSticker);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
