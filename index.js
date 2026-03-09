const express = require("express");
const cors = require("cors");
const path = require("path");
const animeRoutes = require("./src/routes/animeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// 1. Sajikan folder assets secara eksplisit
app.use("/assets", express.static(path.join(__dirname, "assets")));

// 2. Routing API
app.use("/api/v1", animeRoutes);

// 3. Routing Frontend (PENTING!)
// Vercel lebih suka file HTML diakses langsung, tapi ini buat jaga-jaga
app.get("/detail", (req, res) => {
  res.sendFile(path.join(__dirname, "detail.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Jalankan Server untuk Localhost
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server nyala di http://localhost:${PORT}`);
  });
}

module.exports = app;
