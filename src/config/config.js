require("dotenv").config();

module.exports = {
  // Tetep ada buat jalanin di laptop, tapi gak ganggu di Vercel
  PORT: process.env.PORT || 3000,

  // URL utama buat scraper
  BASE_URL: process.env.BASE_URL || "https://otakudesu.cloud",

  // Jikan API untuk data metadata anime
  JIKAN_URL: "https://api.jikan.moe/v4",
};
