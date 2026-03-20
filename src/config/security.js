const helmetOptions = {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
};

const rateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
};

module.exports = { helmetOptions, rateLimitOptions };
