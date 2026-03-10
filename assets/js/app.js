/**
 * KYLEE STREAM ENGINE V1.2 - PRO EDITION
 * Full Integrated & Fixed for Vercel
 */

const API_URL = "/api/v1";
let state = {
    currentPage: 1,
    currentView: "ongoing",
    currentSlug: "",
    isLoading: false,
    history: JSON.parse(localStorage.getItem("kylee_history")) || [],
    currentData: [],
};

// --- INITIALIZER ---
document.addEventListener("DOMContentLoaded", () => {
    initUI();
    loadGenres();
    loadHome();
    renderHistory(); // Pastiin history muncul pas awal buka
});

// --- UI & SEARCH ENGINE ---
function initUI() {
    const searchInput = document.getElementById("searchInput");
    // Kalau lo pake button dengan ID searchBtn di HTML:
    const searchBtn = document.getElementById("searchBtn");

    if (searchBtn) {
        searchBtn.onclick = () => searchAnime();
    }

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") searchAnime();
        });
    }
}

// --- DATA FETCHING ---
async function loadGenres() {
    const container = document.getElementById("genreList");
    if (!container) return;

    try {
        const res = await axios.get(`${API_URL}/genres`);
        if (res.data && res.data.status === "success") {
            container.innerHTML = res.data.data.map(g => `
                <button onclick="filterByGenre('${g.slug}', '${g.name}')" 
                        class="px-5 py-2 bg-surface border border-white/10 rounded-full text-[9px] font-black uppercase hover:bg-brand transition-all whitespace-nowrap">
                    ${g.name}
                </button>
            `).join("");
        }
    } catch (e) {
        console.error("Genre Error:", e);
    }
}

async function loadHome() {
    setActiveNav("Home");
    state.currentPage = 1;
    state.currentView = "ongoing";
    updateTitle("Beranda Utama");
    await performFetch(`${API_URL}/ongoing?page=1`);
}

async function searchAnime() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;
    state.currentPage = 1;
    state.currentView = "search";
    state.currentSlug = query;
    updateTitle(`Search: ${query}`);
    await performFetch(`${API_URL}/search?q=${query}`);
}

async function performFetch(url, isAppend = false) {
    if (state.isLoading) return;
    state.isLoading = true;

    const grid = document.getElementById("animeGrid");
    if (!isAppend && grid) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center text-xs font-bold animate-pulse">LOADING KYLEE ENGINE...</div>`;
    }

    try {
        const response = await axios.get(url);
        const result = response.data;

        if (result.status === "success" && result.data.length > 0) {
            state.currentData = isAppend ? [...state.currentData, ...result.data] : result.data;
            renderGrid(result.data, isAppend);
        } else {
            if (!isAppend) grid.innerHTML = `<p class="col-span-full text-center py-20">Data Kosong / Gagal Fetch.</p>`;
        }
    } catch (error) {
        handleError(error, url, isAppend);
    } finally {
        state.isLoading = false;
    }
}

// --- RENDER ENGINE ---
function renderGrid(data, isAppend) {
    const grid = document.getElementById("animeGrid");
    const cardsHtml = data.map(anime => `
        <div class="anime-card group cursor-pointer" onclick="navigateToDetail('${anime.slug}')">
            <div class="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface border border-white/5">
                <img src="${anime.thumb}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
                <div class="absolute top-3 left-3 bg-brand px-2 py-1 rounded-md text-[8px] font-black uppercase">${anime.episode || "HOT"}</div>
            </div>
            <div class="mt-3">
                <h3 class="text-[11px] font-black uppercase italic line-clamp-2 text-gray-200">${anime.title}</h3>
            </div>
        </div>
    `).join("");

    if (isAppend) grid.insertAdjacentHTML("beforeend", cardsHtml);
    else grid.innerHTML = cardsHtml;
}

function renderHistory() {
    const container = document.getElementById("riwayat-container");
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem("kylee_history")) || [];
    if (history.length === 0) {
        container.innerHTML = `<p class="text-[8px] text-gray-600">BELUM ADA RIWAYAT</p>`;
        return;
    }

    container.innerHTML = history.map(anime => `
        <div class="min-w-[120px] cursor-pointer" onclick="navigateToDetail('${anime.slug}')">
            <img src="${anime.thumb}" class="w-full aspect-[3/4] object-cover rounded-lg opacity-70 hover:opacity-100 transition">
            <p class="text-[8px] mt-1 font-bold truncate">${anime.title}</p>
        </div>
    `).join("");
}

// --- UTILS ---
function navigateToDetail(slug) {
    // Simpan ke history sebelum pindah halaman
    const currentAnime = state.currentData.find(a => a.slug === slug);
    if (currentAnime) {
        let history = JSON.parse(localStorage.getItem("kylee_history")) || [];
        history = [currentAnime, ...history.filter(h => h.slug !== slug)].slice(0, 10);
        localStorage.setItem("kylee_history", JSON.stringify(history));
    }
    window.location.href = `detail.html?slug=${slug}`;
}

function filterByGenre(slug, name) {
    state.currentPage = 1;
    state.currentView = "genre";
    state.currentSlug = slug;
    updateTitle(`Genre: ${name}`);
    performFetch(`${API_URL}/genres/${slug}?page=1`);
}

function setActiveNav(label) {
    document.querySelectorAll(".nav-link").forEach(nav => {
        nav.classList.toggle("text-brand", nav.innerText.trim().toLowerCase() === label.toLowerCase());
    });
}

function updateTitle(text) {
    const el = document.getElementById("sectionTitle");
    if (el) el.innerText = text;
}

function handleError(err, url, isAppend) {
    const grid = document.getElementById("animeGrid");
    if (grid) grid.innerHTML = `<div class="col-span-full py-20 text-center text-red-500 font-black">TIMEOUT / BLOCKED BY SOURCE</div>`;
}
