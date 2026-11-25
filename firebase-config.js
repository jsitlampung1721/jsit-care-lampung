// =========================================================================
// FIREBASE-CONFIG.JS - Konfigurasi, Fast Cache & Utilitas Bersama
// =========================================================================

// 1. KONFIGURASI WEB APP FIREBASE:
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-mjoOL58ph-VDG30AdzY-6o_BOR7xDKo",
  authDomain: "kitabantu-jsitlampung.firebaseapp.com",
  projectId: "kitabantu-jsitlampung",
  storageBucket: "kitabantu-jsitlampung.firebasestorage.app",
  messagingSenderId: "91062042548",
  appId: "1:91062042548:web:183be266999e441a973ce1"
};

// 2. URL GOOGLE APPS SCRIPT (Upload File ke Google Drive & Backup Sheets)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsR8WUSu1YxQZ39h8MM3pkpa7koZjybfmY8V6zQcBa-Q-N3ZwIUjrw4oY1CQZcZ88ZBw/exec";

// Inisialisasi Firebase Firestore
let db = null;
let useFirebase = false;

function isFirebaseReady() {
  return FIREBASE_CONFIG &&
         FIREBASE_CONFIG.projectId &&
         !FIREBASE_CONFIG.projectId.includes("ISI_PROJECT_ID");
}

if (isFirebaseReady() && typeof firebase !== "undefined") {
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    useFirebase = true;
    db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
      console.warn("Firestore persistence info:", err.code);
    });
  } catch (e) {
    console.error("Gagal inisialisasi Firebase:", e);
    useFirebase = false;
  }
}

// State sesi bersama
let verifiedAdminAuth = null;
try {
  verifiedAdminAuth = JSON.parse(localStorage.getItem('kitabantu_admin_auth')) || null;
} catch (e) {
  verifiedAdminAuth = null;
}

// ================= MESIN FAST CACHE (STALE-WHILE-REVALIDATE) =================
function saveFastCache(key, data) {
  try {
    const payload = {
      ts: Date.now(),
      data: data
    };
    localStorage.setItem('kb_cache_' + key, JSON.stringify(payload));
  } catch (e) {
    // Abaikan jika kuota localStorage penuh
  }
}

function loadFastCache(key, maxAgeMs = 1000 * 60 * 60 * 24) {
  try {
    const raw = localStorage.getItem('kb_cache_' + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    if (maxAgeMs && (Date.now() - parsed.ts > maxAgeMs)) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
}

function clearFastCache(key) {
  try {
    if (key) {
      localStorage.removeItem('kb_cache_' + key);
    } else {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('kb_cache_')) localStorage.removeItem(k);
      });
    }
  } catch (e) {}
}

// Prefetch halaman tujuan agar perpindahan halaman terasa instan
function prefetchPage(url) {
  if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

const donationQuotes = [
  "\"Harta tidak akan berkurang karena sedekah. Mari tebar kebaikan bersama JSIT Lampung hari ini.\"",
  "\"Sedekah itu memadamkan dosa sebagaimana air memadamkan api.\"",
  "\"Tangan di atas lebih baik daripada tangan di bawah. Bantuan Anda sangat berarti bagi saudara kita.\"",
  "\"Senyummu di hadapan saudaramu adalah sedekah, dan bantuanmu adalah keberkahan hidup.\"",
  "\"Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.\"",
  "\"Bantu saudaramu yang membutuhkan, niscaya Allah akan membantumu di saat kesusahan.\"",
  "\"Sedikit dari kita, sangat berarti besar bagi keberlanjutan mereka yang membutuhkan.\"",
  "\"Berbagilah dengan ikhlas, karena senyum kebahagiaan mereka adalah keberkahan kita bersama.\""
];

function getDefaultSettings() {
  return {
    HeroTitle: "KitaBantu Soskem JSIT Lampung",
    HeroSubtext: "Wujud nyata kepedulian dan keprihatinan sosial bersama JSIT Lampung untuk keberlanjutan kebaikan sesama.",
    HeroBgImage1: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200",
    HeroBgImage2: "",
    HeroBgImage3: "",
    PaymentMethods: "Transfer BCA - 1234567890 a.n JSIT Lampung\nTransfer Mandiri - 0987654321 a.n JSIT Lampung\nQRIS All Payment",
    AdminWA: "628123456789",
    AdminWAName: "Admin Soskem JSIT",
    LinkFB: "https://facebook.com",
    LinkIG: "https://instagram.com",
    LinkYT: "https://youtube.com",
    LinkTikTok: "https://tiktok.com"
  };
}

// ================= MODE GELAP / TERANG =================
function initThemeMode() {
  const savedTheme = localStorage.getItem('kitabantu_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
  applyThemeMode(isDark);
}

function applyThemeMode(isDark) {
  const htmlEl = document.documentElement;
  const iconEl = document.getElementById('theme-icon');
  const labelEl = document.getElementById('theme-label');

  if (isDark) {
    htmlEl.classList.add('dark');
    if (iconEl) iconEl.innerText = '☀️';
    if (labelEl) labelEl.innerText = 'Mode Terang';
  } else {
    htmlEl.classList.remove('dark');
    if (iconEl) iconEl.innerText = '🌙';
    if (labelEl) labelEl.innerText = 'Mode Gelap';
  }
}

function toggleThemeMode() {
  const isDarkNow = document.documentElement.classList.contains('dark');
  const nextDark = !isDarkNow;
  localStorage.setItem('kitabantu_theme', nextDark ? 'dark' : 'light');
  applyThemeMode(nextDark);
}

// ================= INDIKATOR & JAM =================
function updateEngineIndicator() {
  const badge = document.getElementById('db-engine-badge');
  const banner = document.getElementById('firebase-status-banner');
  if (useFirebase) {
    if (badge) {
      badge.innerText = "⚡ Firebase Fast Cache";
      badge.className = "hidden sm:inline-block bg-emerald-900/90 text-emerald-300 border border-emerald-600/60 px-2 py-0.5 rounded-full text-[9px] font-bold";
    }
    if (banner) banner.classList.add('hidden');
  } else {
    if (badge) {
      badge.innerText = "⏳ GAS Fallback Mode";
      badge.className = "hidden sm:inline-block bg-amber-900/90 text-amber-300 border border-amber-600/60 px-2 py-0.5 rounded-full text-[9px] font-bold";
    }
    if (banner) banner.classList.remove('hidden');
  }
}

function updateLiveClock() {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const clockEl = document.getElementById('top-bar-clock');
  if (clockEl) {
    clockEl.innerText = `${dayName}, ${date} ${monthName} ${year} | ${timeStr} WIB`;
  }
}

function setDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const index = dayOfYear % donationQuotes.length;
  const el = document.getElementById('daily-quote-text');
  if (el) el.innerText = donationQuotes[index];
}

// ================= API & FORMATTER =================
async function callGasApi(action, payload = {}, background = false) {
  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_URL_WEB_APP")) {
    throw new Error("SCRIPT_URL belum dikonfigurasi.");
  }
  const bodyData = JSON.stringify({ action: action, ...payload });
  const fetchOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: bodyData
  };
  if (background) fetchOpts.keepalive = true;
  const response = await fetch(SCRIPT_URL, fetchOpts);
  return await response.json();
}

function mirrorToGoogleSheets(type, record) {
  if (!SCRIPT_URL) return;
  callGasApi('syncBackupFromFirebase', { type: type, record: record }, true).catch(() => {});
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number || 0);
}

function formatDateNowStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getSisaHariText(deadlineStr) {
  if (!deadlineStr) return "Tanpa Batas";
  let deadline;
  if (deadlineStr.includes('-')) {
    const parts = deadlineStr.split('-');
    deadline = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    deadline = new Date(deadlineStr);
  }

  if (isNaN(deadline.getTime())) return "Tanpa Batas";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} Hari lagi`;
  if (diffDays === 0) return "Hari Terakhir";
  return "Selesai";
}

function showCustomAlert(message, isSuccess = true) {
  const alertEl = document.getElementById('custom-alert');
  const msgEl = document.getElementById('alert-message');
  const iconEl = document.getElementById('alert-icon');
  if (!alertEl || !msgEl || !iconEl) return;

  msgEl.innerText = message;
  if (isSuccess) {
    alertEl.className = alertEl.className.replace(/bg-\w+-\d+/, 'bg-emerald-600');
    iconEl.innerText = '✅';
  } else {
    alertEl.className = alertEl.className.replace(/bg-\w+-\d+/, 'bg-rose-600');
    iconEl.innerText = '⚠️';
  }

  alertEl.classList.remove('-translate-y-20', 'opacity-0', 'pointer-events-none');
  alertEl.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    alertEl.classList.remove('translate-y-0', 'opacity-100');
    alertEl.classList.add('-translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

function copyTextToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showCustomAlert(`Nomor rekening berhasil disalin: ${text}`);
  }).catch(() => {
    showCustomAlert('Gagal menyalin teks.', false);
  });
}

function copySelectedAccount() {
  const sel = document.getElementById('select-payment-method');
  if (!sel) return;
  const val = sel.value;
  const matchNum = val.match(/\d{8,20}/);
  const textToCopy = matchNum ? matchNum[0] : val;
  copyTextToClipboard(textToCopy);
}

function toggleWaWidget() {
  const card = document.getElementById('wa-popup-card');
  if (card) card.classList.toggle('hidden');
}

function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('hidden');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
}

function updateTopBarSosmed(settings) {
  if (!settings) return;
  const fb = document.getElementById('link-fb');
  const ig = document.getElementById('link-ig');
  const yt = document.getElementById('link-yt');
  const tt = document.getElementById('link-tiktok');
  if (fb) fb.href = settings.LinkFB || '#';
  if (ig) ig.href = settings.LinkIG || '#';
  if (yt) yt.href = settings.LinkYT || '#';
  if (tt) tt.href = settings.LinkTikTok || '#';
}

function updateWaWidget(settings) {
  if (!settings) return;
  const waName = settings.AdminWAName || 'Admin Soskem JSIT';
  const waNumber = settings.AdminWA || '628123456789';

  const nameEl = document.getElementById('wa-widget-admin-name');
  const linkEl = document.getElementById('wa-widget-link');
  if (nameEl) nameEl.innerText = waName;
  if (linkEl) {
    linkEl.href = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo ' + waName + ', saya ingin bertanya mengenai program donasi KitaBantu.')}`;
  }
}
