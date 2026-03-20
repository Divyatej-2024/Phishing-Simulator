const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "";
  if (!uri) {
    console.warn("MONGODB_URI not set. Database connection skipped.");
    return;
  }
  try {
    await mongoose.connect(uri, {
      autoIndex: true
    });
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
  }
};

module.exports = { connectDB };
