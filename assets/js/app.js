/**
 * KYLEE STREAM ENGINE V1.2 - PRO EDITION
 * Author: Flinn
 * Status: Genre Fixed & Load More Added
 */

const API_URL = window.location.origin + "/api/v1";
let state = {
  currentPage: 1,
  currentView: "ongoing",
  currentSlug: "",
  isLoading: false,
  history: JSON.parse(localStorage.getItem("kylee_history")) || [],
  currentData: [],
};

// INITIALIZER
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  // JALANKAN GENRE DULUAN TANPA TUNGGU APAPUN
  loadGenres();
  loadHome();
});

function initUI() {
  const loader = document.getElementById("global-loader");
  setTimeout(() => {
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => (loader.style.display = "none"), 500);
    }
  }, 800);

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchAnime();
    });
  }
}

// DATA FETCHING ENGINE
async function loadGenres() {
  const container = document.getElementById("genreList");
  if (!container) return;

  try {
    // Timeout dipendekin biar kalau gagal gak nunggu lama
    const res = await axios.get(`${API_URL}/genres`, { timeout: 5000 });
    if (res.data && res.data.status === "success") {
      container.innerHTML = res.data.data
        .map(
          (g) => `
        <button onclick="filterByGenre('${g.slug}', '${g.name}')" 
                class="px-5 py-2 bg-surface border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-brand hover:border-brand hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 whitespace-nowrap">
            ${g.name}
        </button>
      `,
        )
        .join("");
    }
  } catch (e) {
    console.error("GENRE ENGINE ERROR:", e);
    container.innerHTML = `<p class="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Genre system offline</p>`;
  }
}

async function loadHome() {
  setActiveNav("Home");
  state.currentPage = 1;
  state.currentView = "ongoing";
  updateTitle("Beranda Utama");
  await performFetch(`${API_URL}/ongoing?page=1`);
}

async function loadCategory(type) {
  setActiveNav(type.charAt(0).toUpperCase() + type.slice(1));
  state.currentPage = 1;
  state.currentView = type;
  updateTitle(`${type.toUpperCase()} LIST`);

  // HAPUS BARIS INI:
  // const endpoint = type === "movie" || type === "popular" ? "ongoing" : type;
  // GANTI JADI:
  const endpoint = type;

  await performFetch(`${API_URL}/${endpoint}?page=1`);
}

async function loadMore() {
  if (state.isLoading) return;
  state.currentPage++;

  let url = "";
  if (state.currentView === "ongoing")
    url = `${API_URL}/ongoing?page=${state.currentPage}`;
  else if (state.currentView === "genre")
    url = `${API_URL}/genres/${state.currentSlug}?page=${state.currentPage}`;
  else if (state.currentView === "search")
    url = `${API_URL}/search?q=${state.currentSlug}&page=${state.currentPage}`;
  else url = `${API_URL}/${state.currentView}?page=${state.currentPage}`;

  await performFetch(url, true);
}

async function performFetch(url, isAppend = false) {
  if (state.isLoading) return;
  state.isLoading = true;

  const grid = document.getElementById("animeGrid");
  const loadBtn = document.getElementById("loadMoreBtn");

  if (!isAppend) {
    grid.innerHTML = `<div class="col-span-full py-20 text-center animate-pulse">
            <i class="fas fa-circle-notch fa-spin text-3xl text-brand mb-4"></i>
            <p class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Synchronizing Data...</p>
        </div>`;
  }

  try {
    // KUNCINYA DI SINI: Timeout gue naikin ke 20 detik
    const response = await axios.get(url, { timeout: 20000 });
    const result = response.data;

    if (result.status === "success" && result.data && result.data.length > 0) {
      state.currentData = isAppend
        ? [...state.currentData, ...result.data]
        : result.data;
      renderGrid(result.data, isAppend);
      if (loadBtn) loadBtn.style.display = "flex";
    } else {
      // Kalau dapet status success tapi data kosong, coba fetch ulang sekali lagi otomatis
      if (!isAppend) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-500 uppercase font-black text-xs py-20">No data found. Try clicking the menu again.</p>`;
      }
      if (loadBtn) loadBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    // Kalau error karena timeout, jangan langsung dimatiin, kasih tombol "Retry" yang gak ngereload page
    handleError(error, url, isAppend);
  } finally {
    state.isLoading = false;
  }
}

// RENDER ENGINE
function renderGrid(data, isAppend) {
  const grid = document.getElementById("animeGrid");
  const cardsHtml = data
    .map(
      (anime) => `
    <div class="anime-card group animate-fade-in cursor-pointer" onclick="navigateToDetail('${anime.slug}')">
        <div class="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface border border-white/5">
            <img src="${anime.thumb}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="${anime.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="absolute top-3 left-3 bg-brand px-2 py-1 rounded-md text-[8px] font-black uppercase z-10 shadow-lg">${anime.episode || "HOT"}</div>
            <div class="absolute inset-0 bg-gradient-to-t from-dark via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <button class="bg-brand text-white w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Watch Now</button>
            </div>
        </div>
        <div class="mt-3">
            <h3 class="text-[11px] font-black uppercase italic tracking-tight line-clamp-2 text-gray-200 group-hover:text-brand transition-colors">${anime.title}</h3>
            <p class="text-[8px] font-bold text-gray-600 uppercase mt-1 tracking-widest">Kylee System</p>
        </div>
    </div>
  `,
    )
    .join("");

  if (isAppend) grid.insertAdjacentHTML("beforeend", cardsHtml);
  else grid.innerHTML = cardsHtml;
}

// SEARCH & FILTER
async function searchAnime() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;
  state.currentPage = 1;
  state.currentView = "search";
  state.currentSlug = query;
  updateTitle(`Search: ${query}`);
  await performFetch(`${API_URL}/search?q=${query}`);
}

async function filterByGenre(slug, name) {
  state.currentPage = 1;
  state.currentView = "genre";
  state.currentSlug = slug;
  updateTitle(`Genre: ${name}`);
  window.scrollTo({ top: 400, behavior: "smooth" });
  await performFetch(`${API_URL}/genres/${slug}?page=1`);
}

// UTILS
function setActiveNav(label) {
  document.querySelectorAll(".nav-link").forEach((nav) => {
    nav.classList.remove("text-brand", "active");
    if (nav.innerText.trim().toLowerCase() === label.toLowerCase())
      nav.classList.add("text-brand", "active");
  });
}

function updateTitle(text) {
  const el = document.getElementById("sectionTitle");
  if (el) el.innerText = text;
}

function handleError(err, url, isAppend) {
  const grid = document.getElementById("animeGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center">
          <i class="fas fa-wifi-slash text-3xl text-red-500 mb-4"></i>
          <p class="font-black uppercase italic text-sm text-white">Connection Slow or Timeout</p>
          <p class="text-[9px] text-gray-500 uppercase mt-1">Server is taking too long to respond</p>
          <button onclick="performFetch('${url}', ${isAppend})" class="mt-6 px-8 py-2 border border-brand text-brand text-[10px] font-black uppercase rounded-full hover:bg-brand hover:text-white transition">
            <i class="fas fa-sync-alt mr-2"></i> Try Again
          </button>
      </div>`;
  }
}

function navigateToDetail(slug) {
  window.location.href = `detail.html?slug=${slug}`;
}
