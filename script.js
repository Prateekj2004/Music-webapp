// Audio Player Core
let currentsong = null;
let play = null;
let songs = [];
let currentIndex = 0;
let currfolder = '';
let allSongs = [];
let searchResults = document.querySelector(".search-results");
let searchTimeout = null;

// DOM Elements
const elements = {
    songInfo: document.querySelector(".songinfo"),
    songTime: document.querySelector(".songtime"),
    songList: document.querySelector(".songlist ul"),
    cardContainer: document.querySelector(".cardContainer"),
    volumeControl: document.getElementById("volumeControl"),
    searchInput: document.getElementById("searchInput"),
    playButton: document.getElementById("play"),
    prevButton: document.getElementById("previous"),
    nextButton: document.getElementById("next"),
    seekBar: document.querySelector(".seekbar"),
    volumeIcon: document.querySelector(".volume i"),
    hamburger: document.querySelector(".hamburger"),
    closeButton: document.querySelector(".close"),
    leftPanel: document.querySelector(".left")
};

// Helper Functions
function formatFolderName(folder) {
    return decodeURIComponent(folder)
        .replace(/%/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function showError(message) {
    console.error(message);
    // Optional: Add visual error feedback
}

function cleanupAudio() {
    if (currentsong) {
        currentsong.pause();
        currentsong.removeEventListener('timeupdate', updateProgress);
        currentsong.removeEventListener('ended', playNext);
        currentsong.src = '';
        currentsong = null;
    }
}

// Player Functions
function initAudio() {
    cleanupAudio();
    currentsong = new Audio();
    currentsong.addEventListener('timeupdate', updateProgress);
    currentsong.addEventListener('ended', playNext);
}

function updateProgress() {
    const currentTime = currentsong.currentTime;
    const duration = currentsong.duration || 0;
    const progress = duration ? (currentTime / duration) * 100 : 0;

    document.querySelector(".circle").style.left = `${progress}%`;
    elements.songTime.innerHTML = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function playNext() {
    const newIndex = (currentIndex + 1) % songs.length;
    playmusic(newIndex);
}

const playmusic = (index, pause = false) => {
    if (index < 0 || index >= songs.length) return;
    
    currentIndex = index;
    const track = songs[currentIndex];
    const cleanName = track.replace(/\.(mp3|MP3)$/, "");
    const [songName, artistName] = cleanName.split("-").map(s => s.trim());
    
    elements.songInfo.textContent = songName;
    elements.songTime.textContent = "00:00 / 00:00";
    
    initAudio();
    currentsong.src = `${currfolder}/${track}`;
    
    if (!pause) {
        currentsong.play().catch(e => showError("Playback failed: " + e));
        play.classList?.remove("hgi-play");
        play.classList?.add("hgi-pause");
    }
};

// Data Loading
async function getAllSongs() {
    try {
        const response = await fetch(`songs/`);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        
        const folders = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.includes("/songs/"))
            .map(a => a.href.split('/').filter(Boolean).pop());
        
        for (const folder of folders) {
            await processFolder(folder);
        }
    } catch (error) {
        showError("Error fetching songs: " + error);
    }
}

async function processFolder(folder) {
    try {
        const response = await fetch(`songs/${folder}/`);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        
        Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.endsWith(".mp3"))
            .forEach(a => {
                const songPath = decodeURIComponent(a.href.split(`songs/${folder}/`)[1]);
                const cleanName = songPath.replace(/\.(mp3|MP3)$/, "");
                const [songName, artistName] = cleanName.split("-").map(s => s.trim());
                
                allSongs.push({
                    path: `songs/${folder}/${songPath}`,
                    name: songName,
                    artist: artistName || formatFolderName(folder),
                    folder: `songs/${folder}`
                });
            });
    } catch (error) {
        showError(`Error processing folder ${folder}: ${error}`);
    }
}

async function getsongs(folder) {
    currfolder = folder;
    try {
        const response = await fetch(`${folder}/`);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        
        songs = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.endsWith(".mp3"))
            .map(a => decodeURIComponent(a.href.split(`${folder}/`)[1]));
        
        renderSongList();
        return songs;
    } catch (error) {
        showError(`Error loading songs from ${folder}: ${error}`);
        return [];
    }
}

function renderSongList() {
    elements.songList.innerHTML = '';
    const folderName = formatFolderName(currfolder.split("/").pop());
    
    songs.forEach((song, index) => {
        const cleanName = song.replace(/\.(mp3|MP3)$/, "");
        const [songName, artistName] = cleanName.split("-").map(s => s.trim());
        
        const li = document.createElement("li");
        li.setAttribute("data-index", index);
        li.innerHTML = `
            <i class="hgi hgi-stroke hgi-music-note-03 ss"></i>
            <div class="info">
                <div>${songName}</div>
                <div>${artistName || folderName}</div>
            </div>
            <div class="playnow">
                <span>Play now</span>
                <i class="hgi hgi-stroke hgi-play-circle"></i>
            </div>`;
        
        li.addEventListener("click", () => playmusic(index));
        elements.songList.appendChild(li);
    });
}

// Album Display
async function displayalbums() {
    try {
        const response = await fetch(`songs/`);
        const htmlText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = htmlText;
        
        elements.cardContainer.innerHTML = '';
        
        const folders = Array.from(div.getElementsByTagName("a"))
            .filter(a => a.href.includes("/songs/"))
            .map(a => a.href.split('/').filter(Boolean).pop());
        
        for (const folder of folders) {
            await createAlbumCard(folder);
        }
        
        addCardEventListeners();
    } catch (error) {
        showError("Error displaying albums: " + error);
    }
}

async function createAlbumCard(folder) {
    const formattedFolder = formatFolderName(folder);
    let info = {};

    try {
        const infoResponse = await fetch(`songs/${folder}/info.json`);
        if (infoResponse.ok) {
            info = await infoResponse.json();
        }
    } catch (error) {
        console.log(`No info.json for ${folder}`);
    }

    elements.cardContainer.innerHTML += `
        <div data-folder="songs/${folder}" class="card">
            <div class="icon-container">
                <i class="hgi hgi-stroke hgi-play"></i>
            </div>
            <img src="/songs/${folder}/cover.jpg" alt="${formattedFolder}" onerror="this.src='https://via.placeholder.com/150'">
            <h2>${info.title || formattedFolder}</h2>
            <p>${info.description || `Songs by ${formattedFolder}`}</p>
        </div>`;
}

function addCardEventListeners() {
    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async () => {
            songs = await getsongs(card.dataset.folder);
            if (songs.length > 0) playmusic(0);
        });
    });
}

// Search Functionality
function performSearch(query) {
    if (!query) {
        searchResults.style.display = 'none';
        return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const results = allSongs.filter(song => 
        song.name.toLowerCase().includes(lowerQuery) || 
        song.artist.toLowerCase().includes(lowerQuery)
    );

    displaySearchResults(results);
}

function displaySearchResults(results) {
    searchResults.innerHTML = results.length ? 
        results.map(song => `
            <div class="search-result-item">
                <i class="hgi hgi-stroke hgi-music-note-03"></i>
                <div class="search-result-info">
                    <div class="search-result-title">${song.name}</div>
                    <div class="search-result-artist">${song.artist}</div>
                </div>
            </div>`
        ).join('') : 
        '<div class="no-results">No results found</div>';

    searchResults.style.display = 'block';
    addSearchResultEventListeners(results);
}

function addSearchResultEventListeners(results) {
    document.querySelectorAll('.search-result-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            getsongs(results[index].folder).then(() => {
                const songIndex = songs.findIndex(s => s === results[index].path.split('/').pop());
                if (songIndex !== -1) playmusic(songIndex);
            });
            searchResults.style.display = 'none';
            elements.searchInput.value = '';
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Player Controls
    elements.playButton.addEventListener("click", togglePlay);
    elements.prevButton.addEventListener("click", () => playmusic((currentIndex - 1 + songs.length) % songs.length));
    elements.nextButton.addEventListener("click", playNext);
    elements.seekBar.addEventListener("click", handleSeek);
    
    // Volume Control
    elements.volumeControl.addEventListener("input", handleVolumeChange);
    elements.volumeIcon.addEventListener("click", toggleMute);
    
    // Search
    elements.searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
    });
    elements.searchInput.addEventListener("focus", () => {
        if (elements.searchInput.value) performSearch(elements.searchInput.value);
    });
    
    // Mobile Menu
    elements.hamburger.addEventListener("click", () => elements.leftPanel.style.left = "0");
    elements.closeButton.addEventListener("click", () => elements.leftPanel.style.left = "-120%");
    
    // Close search results when clicking elsewhere
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-container") && !e.target.closest(".search-results")) {
            searchResults.style.display = 'none';
        }
    });
}

function togglePlay() {
    if (currentsong?.paused) {
        currentsong.play().catch(e => showError("Playback failed: " + e));
        elements.playButton.classList.remove("hgi-play");
        elements.playButton.classList.add("hgi-pause");
    } else {
        currentsong?.pause();
        elements.playButton?.classList.remove("hgi-pause");
        elements.playButton?.classList.add("hgi-play");
    }
}

function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    if (currentsong?.duration) {
        currentsong.currentTime = percentage * currentsong.duration;
    }
}

function handleVolumeChange(e) {
    const volume = e.target.value / 100;
    currentsong.volume = volume;
    elements.volumeIcon.classList.toggle("hgi-volume-off", volume === 0);
    elements.volumeIcon.classList.toggle("hgi-volume-high", volume > 0);
}

function toggleMute() {
    const isMuted = currentsong.volume === 0;
    currentsong.volume = isMuted ? 0.5 : 0;
    elements.volumeControl.value = isMuted ? 50 : 0;
    elements.volumeIcon.classList.toggle("hgi-volume-off", !isMuted);
    elements.volumeIcon.classList.toggle("hgi-volume-high", isMuted);
}

// Initialize App
async function init() {
    try {
        setupEventListeners();
        await getAllSongs();
        await getsongs("songs/karan-aujla");
        await displayalbums();
        playmusic(0, true);
    } catch (error) {
        showError("Initialization failed: " + error);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);