const express = require("express");
const router = express.Router();
const animeController = require("../controllers/animeController");
const NodeCache = require("node-cache");

// Buat loker penyimpanan (Cache). Data basi setelah 1 jam (3600 detik)
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// FUNGSI PINTAR: Cek data di memori dulu biar gak perlu scraping ulang
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl; // Kunci unik berdasarkan URL (misal: /api/v1/ongoing?page=1)
  if (myCache.has(key)) {
    console.log(`[NIMESTREAM-CACHE] Data ditemukan untuk: ${key}`);
    return res.json(myCache.get(key));
  }

  // Kalau gak ada, kita "intercept" responnya buat disimpen ke cache pas dapet data
  res.sendResponse = res.json;
  res.json = (body) => {
    myCache.set(key, body);
    res.sendResponse(body);
  };
  next();
};

// --- ROUTES DENGAN CACHE (Data yang jarang berubah tiap menit) ---

// 1. Route untuk Anime Ongoing
router.get("/ongoing", cacheMiddleware, animeController.getOngoing);

// 2. Route untuk Pencarian (Boleh di-cache sebentar biar gak berat)
router.get("/search", cacheMiddleware, animeController.search);

// 5. Daftar Genre
router.get("/genres", cacheMiddleware, animeController.getAllGenres);

// 6. List anime berdasarkan genre
router.get(
  "/genres/:genreSlug",
  cacheMiddleware,
  animeController.getAnimeByGenre,
);

// 7. List Anime Movie
router.get("/movie", cacheMiddleware, animeController.getMovies);

// 8. List Anime per Season
router.get("/season", cacheMiddleware, animeController.getSeasonList);

// 9. List Anime Populer
router.get("/popular", cacheMiddleware, animeController.getPopular);

// --- ROUTES TANPA CACHE (Data yang butuh Real-time / Sering update) ---

// 3. Detail Anime & List Episode (Sering dipantau buat eps baru)
router.get("/detail/:slug", animeController.getDetail);

// 4. Link Streaming Video (Link sering expired, jadi mending ambil fresh terus)
router.get("/watch/:epSlug", animeController.getStream);

module.exports = router;
