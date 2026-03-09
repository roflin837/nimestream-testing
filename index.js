const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT } = require("./src/config/config");
const animeRoutes = require("./src/routes/animeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// PENTING: Agar file index.html dan detail.html bisa dibaca browser
app.use(express.static(path.join(__dirname)));
app.use("/assets", express.static(path.join(__dirname, "assets")));

app.use("/api/v1", animeRoutes);

// Rute utama ke index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Middleware 404
app.use((req, res) => {
  res.status(404).send("Waduh, halaman yang lo cari gak ada, Flinn!");
});

// Jalankan Server (Hanya jalan kalau di localhost)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server nyala di http://localhost:${PORT}`);
  });
}

// WAJIB ADA BUAT VERCEL:
module.exports = app;
