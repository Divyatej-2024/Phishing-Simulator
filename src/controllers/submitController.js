const submitAnswer = async (req, res) => {
  // Placeholder until Step 3/4 add rule engine + tracking.
  res.json({
    ok: true,
    score: 0,
    verdict: "Suspicious",
    reasons: ["Rule engine not yet initialized."]
  });
};

module.exports = { submitAnswer };
