const express = require("express");
const scenarioController = require("../controllers/scenarioController");

const router = express.Router();

router.get("/", scenarioController.getScenarios);

module.exports = router;
