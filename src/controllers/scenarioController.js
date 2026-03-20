const scenarioService = require("../services/scenarioService");

const getScenarios = async (req, res) => {
  const scenarios = scenarioService.getAll();
  res.json({ scenarios });
};

module.exports = { getScenarios };
