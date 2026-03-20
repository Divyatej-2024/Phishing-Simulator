const express = require("express");
const submitController = require("../controllers/submitController");
const { submitRules, validate } = require("../middleware/validate");

const router = express.Router();

router.post("/", submitRules, validate, submitController.submitAnswer);

module.exports = router;
