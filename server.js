const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, nameIndex: {} }, null, 2));
  }
}

function loadData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.nameIndex) {
      return { users: {}, nameIndex: {} };
    }
    return parsed;
  } catch (error) {
    return { users: {}, nameIndex: {} };
  }
}

function saveData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function getUserIdFromRequest(req) {
  return req.header("x-user-id") || "";
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const name = (req.body && req.body.name) ? String(req.body.name).trim() : "";
  if (!name) {
    res.status(400).json({ error: "Name required" });
    return;
  }

  const data = loadData();
  const key = normalizeName(name);
  let userId = data.nameIndex[key];

  if (!userId) {
    userId = `u_${crypto.randomUUID()}`;
    data.nameIndex[key] = userId;
    data.users[userId] = {
      id: userId,
      name,
      state: null,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }

  const user = data.users[userId];
  res.json({ userId, state: user ? user.state : null });
});

app.get("/api/state", (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing user id" });
    return;
  }
  const data = loadData();
  const user = data.users[userId];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user.state || null);
});

app.post("/api/state", (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing user id" });
    return;
  }
  const data = loadData();
  const user = data.users[userId];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.state = req.body || null;
  user.updatedAt = new Date().toISOString();
  data.users[userId] = user;
  saveData(data);
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AegisPhish Lab running on http://localhost:${PORT}`);
});
