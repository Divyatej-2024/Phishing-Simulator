const { body, validationResult } = require("express-validator");

const submitRules = [
  body("scenarioId").isString().trim().isLength({ min: 1, max: 80 }),
  body("content").optional().isString().trim().isLength({ max: 4000 }),
  body("indicators").optional().isArray({ max: 20 }),
  body("userVerdict").isIn(["Safe", "Suspicious", "Phishing"]),
  body("timedOut").optional().isBoolean().toBoolean()
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Invalid input", details: errors.array() });
  }
  next();
};

module.exports = { submitRules, validate };
