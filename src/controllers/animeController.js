const axios = require("axios");
const animeService = require("../services/animeService");

// Mengambil URL dari config (Centralized)
const { JIKAN_URL } = require("../config/config");

const animeController = {
  // 1. List Ongoing (Data Jikan)
  getOngoing: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const response = await axios.get(`${JIKAN_URL}/seasons/now`, {
        params: { page, limit: 24 },
      });

      const data = response.data.data.map((anime) => ({
        title: anime.title,
        slug: anime.mal_id,
        thumb: anime.images.webp.large_image_url,
        episode: anime.episodes ? `Total ${anime.episodes} Eps` : "ONGOING",
        score: anime.score || "0.0",
        type: anime.type,
      }));

      res.json({ status: "success", data });
    } catch (err) {
      console.error("Ongoing Error:", err.message);
      res
        .status(500)
        .json({ status: "error", message: "Jikan API lagi sibuk, Flinn!" });
    }
  },

  // 2. Search Anime (Data Jikan)
  search: async (req, res) => {
    try {
      const query = req.query.q;
      const page = req.query.page || 1;
      if (!query)
        return res
          .status(400)
          .json({ status: "fail", message: "Cari apa, Flinn?" });

      const response = await axios.get(`${JIKAN_URL}/anime`, {
        params: { q: query, page, limit: 24 },
      });

      const data = response.data.data.map((anime) => ({
        title: anime.title,
        slug: anime.mal_id,
        thumb: anime.images.webp.large_image_url,
        score: anime.score || "0.0",
        type: anime.type,
      }));

      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 3. Detail Anime (LOGIKA PERKAWINAN JIKAN + SCRAPER)
  getDetail: async (req, res) => {
    try {
      const slug = req.params.slug; // ID dari MyAnimeList

      // Ambil Info Utama dari Jikan
      const infoRes = await axios.get(`${JIKAN_URL}/anime/${slug}`);
      const anime = infoRes.data.data;

      // --- LOGIKA ANTI LINK NOT FOUND ---
      // Kita buat list variasi judul biar scraper nemu
      const searchQueries = [
        anime.title, // Judul Utama
        anime.title_english, // Judul Inggris
        anime.title.split(":")[0].trim(), // Potong sebelum tanda ":"
        anime.title.split("-")[0].trim(), // Potong sebelum tanda "-"
      ].filter(Boolean);

      // Hapus judul duplikat
      const uniqueQueries = [...new Set(searchQueries)];

      let episodes = [];
      let foundSource = false;

      // Mulai mencari di Scraper
      for (const query of uniqueQueries) {
        if (foundSource) break;

        // Bersihkan simbol aneh & tahun (misal: "2011") agar scraper gak bingung
        const cleanQuery = query
          .replace(/\(20\d{2}\)/g, "")
          .replace(/[^a-zA-Z0-9 ]/g, " ")
          .trim();

        console.log(`[System] Flinn, lagi nyoba cari: ${cleanQuery}`);
        const streamData = await animeService.searchAnime(cleanQuery, 1);

        if (streamData && streamData.length > 0) {
          // Ambil detail dari hasil pertama yang ketemu
          const detailStream = await animeService.getDetail(streamData[0].slug);

          // Cek apakah ada list episode (mendukung 'episodes' atau 'episode_list')
          const epList = detailStream.episodes || detailStream.episode_list;

          if (epList && epList.length > 0) {
            episodes = epList;
            foundSource = true;
            console.log(`[Success] Ketemu di judul: ${cleanQuery}`);
          }
        }
      }

      res.json({
        status: "success",
        data: {
          title: anime.title,
          title_jp: anime.title_japanese,
          thumb: anime.images.webp.large_image_url,
          synopsis: anime.synopsis,
          score: anime.score,
          duration: anime.duration,
          trailer: anime.trailer.embed_url,
          genres: anime.genres.map((g) => g.name),
          episodes: episodes, // List episode buat Kylee Stream
        },
      });
    } catch (err) {
      console.error("Detail Error:", err.message);
      res
        .status(500)
        .json({ status: "error", message: "Gagal narik detail nih!" });
    }
  },

  // 4. Stream Video (Scraper)
  getStream: async (req, res) => {
    try {
      const epSlug = req.params.epSlug;
      const data = await animeService.getStream(epSlug);
      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 5. Movies
  getMovies: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const response = await axios.get(`${JIKAN_URL}/top/anime`, {
        params: { type: "movie", page, limit: 24 },
      });

      const data = response.data.data.map((anime) => ({
        title: anime.title,
        slug: anime.mal_id,
        thumb: anime.images.webp.large_image_url,
        score: anime.score,
        type: anime.type,
      }));

      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 6. Populer
  getPopular: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const response = await axios.get(`${JIKAN_URL}/top/anime`, {
        params: { page, limit: 24 },
      });

      const data = response.data.data.map((anime) => ({
        title: anime.title,
        slug: anime.mal_id,
        thumb: anime.images.webp.large_image_url,
        score: anime.score,
        type: anime.type,
      }));

      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 7. Season List
  getSeasonList: async (req, res) => {
    try {
      const response = await axios.get(`${JIKAN_URL}/seasons`);
      res.json({ status: "success", data: response.data.data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 8. Genre List (Scraper)
  getAllGenres: async (req, res) => {
    try {
      const data = await animeService.getAllGenres();
      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },

  // 9. Anime by Genre (Scraper)
  getAnimeByGenre: async (req, res) => {
    try {
      const genreSlug = req.params.genreSlug;
      const page = req.query.page || 1;
      const data = await animeService.getAnimeByGenre(genreSlug, page);
      res.json({ status: "success", data });
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  },
};

module.exports = animeController;
