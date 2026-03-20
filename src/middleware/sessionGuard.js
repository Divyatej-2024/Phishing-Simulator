const crypto = require("crypto");

const sessions = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ACTIONS = 120;

function getSessionKey(req) {
  const headerKey = req.header("x-session-id");
  if (headerKey) {
    return headerKey;
  }
  const seed = `${req.ip}-${req.get("user-agent") || ""}`;
  return crypto.createHash("sha256").update(seed).digest("hex");
}

module.exports = (req, res, next) => {
  const sessionKey = getSessionKey(req);
  const now = Date.now();
  const record = sessions.get(sessionKey) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  record.count += 1;
  sessions.set(sessionKey, record);

  if (record.count > MAX_ACTIONS) {
    return res.status(429).json({ error: "Too many actions. Slow down." });
  }

  req.sessionKey = sessionKey;
  next();
};
