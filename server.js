const express = require("express");
const path = require("path");
require("dotenv").config();
const helmet = require("helmet");

const { connectDB } = require("./src/config/db");
const { helmetOptions, rateLimitOptions } = require("./src/config/security");
const rateLimiter = require("./src/middleware/rateLimiter");
const sessionGuard = require("./src/middleware/sessionGuard");
const scenarioRoutes = require("./src/routes/scenarioRoutes");
const submitRoutes = require("./src/routes/submitRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(helmet(helmetOptions));
app.use(rateLimiter(rateLimitOptions));
app.use(express.static(PUBLIC_DIR));

connectDB();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "AegisPhish Lab API" });
});

app.use("/api/scenarios", scenarioRoutes);
app.use("/api/submit", sessionGuard, submitRoutes);
app.use("/api/dashboard", sessionGuard, dashboardRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AegisPhish Lab running on http://localhost:${PORT}`);
});
