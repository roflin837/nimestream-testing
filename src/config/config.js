require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL || "https://otakudesu.cloud",
  JIKAN_URL: "https://api.jikan.moe/v4", // Tambahin ini biar pro
};
