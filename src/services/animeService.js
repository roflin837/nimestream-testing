const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const { BASE_URL } = require("../config/config");

const fetcher = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Turunin ke 15 detik biar gak nunggu kelamaan
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: BASE_URL, // Pake variabel BASE_URL aja biar dinamis
    Connection: "keep-alive",
  },
});

const animeService = {
  // 1. Ambil List Anime Ongoing
  getOngoing: async (page = 1) => {
    try {
      const url = page > 1 ? `/ongoing-anime/page/${page}/` : "/ongoing-anime/";
      const { data } = await fetcher.get(url);
      const $ = cheerio.load(data);
      const animeList = [];

      $(".venz ul li").each((i, el) => {
        const title = $(el).find("h2").text().trim();
        const thumb = $(el).find("img").attr("src");
        const episode = $(el).find(".epz").text().trim();
        const link = $(el).find("a").attr("href");
        const slug = link ? link.split("/").filter(Boolean).pop() : null;

        if (title && slug) animeList.push({ title, thumb, episode, slug });
      });
      return animeList;
    } catch (err) {
      throw new Error("Gagal ambil ongoing: " + err.message);
    }
  },

  // 2. Cari Anime
  searchAnime: async (query, page = 1) => {
    try {
      const url =
        page > 1
          ? `/page/${page}/?s=${query}&post_type=anime`
          : `/?s=${query}&post_type=anime`;
      const { data } = await fetcher.get(url);
      const $ = cheerio.load(data);
      const searchResults = [];

      $(".chivsrc li").each((i, el) => {
        const title = $(el).find("h2 a").text().trim();
        const thumb = $(el).find("img").attr("src");
        const link = $(el).find("h2 a").attr("href");
        const slug = link ? link.split("/").filter(Boolean).pop() : null;
        const status = $(el)
          .find(".set")
          .eq(1)
          .text()
          .replace("Status : ", "")
          .trim();

        if (title && slug) searchResults.push({ title, thumb, slug, status });
      });
      return searchResults;
    } catch (err) {
      throw new Error("Gagal cari anime: " + err.message);
    }
  },

  // 3. Detail Anime
  getDetail: async (slug) => {
    try {
      const { data } = await fetcher.get(`/anime/${slug}/`);
      const $ = cheerio.load(data);
      const info = {};
      const genres = [];

      $(".infoanime .infoz p").each((i, el) => {
        const text = $(el).text();
        if (text.includes(":")) {
          const parts = text.split(":");
          const key = parts[0].trim().toLowerCase().replace(/\s+/g, "_");
          const val = parts[1].trim();
          if (!text.includes("Genre")) info[key] = val;
        }

        if (text.includes("Genre")) {
          $(el)
            .find("a")
            .each((j, g) => {
              genres.push({
                name: $(g).text().trim(),
                slug: $(g).attr("href")?.split("/").filter(Boolean).pop(),
              });
            });
        }
      });

      const episodes = [];
      $(".episodelist ul li").each((i, el) => {
        const a = $(el).find("a");
        if (a.attr("href")) {
          episodes.push({
            epTitle: a.text().trim(),
            epSlug: a.attr("href").split("/").filter(Boolean).pop(),
          });
        }
      });

      return {
        title: $(".jdlname").text().trim() || $("h1").first().text().trim(),
        thumb: $(".fotoanime img").attr("src"),
        sinopsis: $(".sinopc").text().trim() || $(".sinopsi p").text().trim(),
        info,
        genres,
        episodes,
      };
    } catch (err) {
      throw new Error("Gagal ambil detail: " + err.message);
    }
  },

  // 4. Stream Video
  getStream: async (epSlug) => {
    try {
      const { data } = await fetcher.get(`/episode/${epSlug}/`);
      const $ = cheerio.load(data);
      const streamUrl =
        $("#pembed iframe").attr("src") || $("iframe").first().attr("src");
      return { streamUrl };
    } catch (err) {
      throw new Error("Gagal ambil stream: " + err.message);
    }
  },

  // 5. List Genre
  getAllGenres: async () => {
    try {
      const { data } = await fetcher.get("/genre-list/");
      const $ = cheerio.load(data);
      const genres = [];
      $(".genres li a").each((i, el) => {
        const name = $(el).text().trim();
        const link = $(el).attr("href");
        if (name && link) {
          genres.push({ name, slug: link.split("/").filter(Boolean).pop() });
        }
      });
      return genres;
    } catch (err) {
      throw new Error("Gagal ambil list genre: " + err.message);
    }
  },

  // 6. Anime By Genre (Anti-Empty Fix)
  getAnimeByGenre: async (genreSlug, page = 1) => {
    try {
      const slug = genreSlug.toLowerCase().trim();
      const url = `/genres/${slug}/page/${page}/`;

      console.log(`[DEBUG] Menghubungi: ${url}`);

      const { data } = await fetcher.get(url);

      // --- DEBUGGER START ---
      console.log("--- CEK ISI RESPONS ---");
      if (data.includes("Cloudflare") || data.includes("Just a moment")) {
        console.log(
          "❌ ZONK: Kena Blokir Cloudflare (Dikasih halaman loading)",
        );
      } else if (data.includes("404 Not Found")) {
        console.log("❌ ZONK: URL Salah atau Halaman Gak Ada");
      } else {
        console.log("✅ HTML AMAN: Berhasil masuk ke halaman target");
      }
      // Munculin 200 karakter pertama biar lo yakin
      console.log("Potongan HTML:", data.substring(0, 200).replace(/\n/g, " "));
      console.log("-----------------------");
      // --- DEBUGGER END ---

      const $ = cheerio.load(data);
      const animeList = [];

      // Selektor Gabungan (Strategi A, B, dan C disatuin)
      const items = $(
        ".venz ul li, .relat .col-anime, .admin-container .col-anime, .col-anime, .chivsrc li",
      );

      items.each((i, el) => {
        const title = $(el)
          .find(".col-anime-title a, h2 a, h2")
          .first()
          .text()
          .trim();
        const thumb = $(el).find("img").attr("src");
        const link = $(el).find("a").first().attr("href");
        const animeSlug = link ? link.split("/").filter(Boolean).pop() : null;
        const status = $(el).find(".col-anime-eps, .epz").first().text().trim();

        if (title && animeSlug) {
          animeList.push({
            title,
            thumb,
            slug: animeSlug,
            status: status || "Genre",
          });
        }
      });

      console.log(`[DEBUG] Selesai! Found: ${animeList.length}`);
      return animeList;
    } catch (err) {
      console.error("[Scraper Error]:", err.message);
      return [];
    }
  },

  // 7. Ambil List Anime Movie (BARU)
  getMovies: async (page = 1) => {
    try {
      const url =
        page > 1 ? `/complete-anime/page/${page}/` : "/complete-anime/";
      const { data } = await fetcher.get(url);
      const $ = cheerio.load(data);
      const animeList = [];

      $(".venz ul li").each((i, el) => {
        const title = $(el).find("h2").text().trim();
        const thumb = $(el).find("img").attr("src");
        const status = $(el).find(".epz").text().trim(); // Biasanya "Movie" atau "Complete"
        const link = $(el).find("a").attr("href");
        const slug = link ? link.split("/").filter(Boolean).pop() : null;

        // Filter: Hanya ambil yang judulnya mengandung "Movie" atau status "Complete"
        if (title && slug) animeList.push({ title, thumb, status, slug });
      });
      return animeList;
    } catch (err) {
      throw new Error("Gagal ambil movie: " + err.message);
    }
  },

  // 8. Ambil List Anime Terpopuler (BARU)
  getPopular: async (page = 1) => {
    try {
      // Menggunakan route default atau ongoing sebagai fallback popular
      const { data } = await fetcher.get("/");
      const $ = cheerio.load(data);
      const animeList = [];

      // Otakudesu biasanya naruh yang populer di sidebar atau section tertentu
      // Kita ambil dari section 'Ongoing' teratas sebagai representasi 'Popular'
      $(".venz ul li")
        .slice(0, 10)
        .each((i, el) => {
          const title = $(el).find("h2").text().trim();
          const thumb = $(el).find("img").attr("src");
          const slug = $(el)
            .find("a")
            .attr("href")
            ?.split("/")
            .filter(Boolean)
            .pop();

          if (title && slug)
            animeList.push({ title, thumb, slug, status: "Popular" });
        });
      return animeList;
    } catch (err) {
      throw new Error("Gagal ambil popular: " + err.message);
    }
  },

  // 9. Ambil List Season Anime (BARU)
  getSeasonList: async () => {
    try {
      const { data } = await fetcher.get("/anime-list/");
      const $ = cheerio.load(data);
      const seasonList = [];

      // Pakai selektor yang lebih spesifik buat daftar anime per season/alphabet
      $(".bariscontent .jdlbar a, .bariskiri .jdlbar a").each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr("href");
        const slug = link ? link.split("/").filter(Boolean).pop() : null;

        if (title && slug) {
          // Karena halaman ini gak ada thumbnail, kita kasih placeholder
          seasonList.push({
            title,
            slug,
            thumb: "https://via.placeholder.com/300x400?text=Season+List",
            status: "Archive",
          });
        }
      });
      return seasonList;
    } catch (err) {
      throw new Error("Gagal ambil season: " + err.message);
    }
  },
};

module.exports = animeService;
