const express = require("express");
const submitController = require("../controllers/submitController");

const router = express.Router();

router.post("/", submitController.submitAnswer);

module.exports = router;
