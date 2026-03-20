const rateLimit = require("express-rate-limit");

module.exports = (options) => rateLimit(options);
