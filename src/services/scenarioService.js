const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "scenarios.sample.json");

const getAll = () => {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const scenarios = JSON.parse(raw);
    return Array.isArray(scenarios) ? scenarios : [];
  } catch (error) {
    return [];
  }
};

module.exports = { getAll };
