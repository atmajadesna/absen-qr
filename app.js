/* absen.qr — kode absensi berputar per 30 detik
 * Kunci sesi disimpan di localStorage; kode diturunkan lewat HMAC-SHA256.
 * Catatan: demo tanpa server. Di produksi kode wajib diverifikasi di server.
 */
(() => {
  "use strict";

  const WINDOW_MS = 30_000;
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32, tanpa I L O U
  const KEY_STORE = "absen.key.v1";
  const LOG_STORE = "absen.log.v1";

  const $ = (id) => document.getElementById(id);
  const els = {
    kode: $("kode"),
    qr: $("qr"),
    qrFallback: $("qr-fallback"),
    fill: $("timer-fill"),
    timerText: $("timer-text"),
    sesi: $("sesi-id"),
    logDosen: $("log-dosen"),
    logMhs: $("log-mhs"),
    form: $("form-absen"),
    nama: $("nama"),
    kodeInput: $("kode-input"),
    btnAbsen: $("btn-absen"),
    status: $("status"),
    reset: $("reset"),
  };

  // ---------- kunci sesi ----------
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToB64(bytes) {
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function sessionKey() {
    let stored = null;
    try { stored = localStorage.getItem(KEY_STORE); } catch { /* mode privat */ }
    if (stored) return b64ToBytes(stored);
    const key = new Uint8Array(16);
    crypto.getRandomValues(key);
    try { localStorage.setItem(KEY_STORE, bytesToB64(key)); } catch { /* abaikan */ }
    return key;
  }

  const KEY = sessionKey();
  const KEY_ID = bytesToB64(KEY).slice(0, 6);

  let hmacKey = null;
  async function getHmac() {
    if (!hmacKey) {
      hmacKey = crypto.subtle.importKey(
        "raw", KEY, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
    }
    return hmacKey;
  }

  function windowOf(ms) {
    return Math.floor(ms / WINDOW_MS);
  }

  async function codeFor(win) {
    const key = await getHmac();
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("w:" + win));
    const bytes = new Uint8Array(mac);
    let out = "";
    for (let i = 0; i < 6; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
  }

  function normalize(raw) {
    return String(raw || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  }

  // ---------- daftar hadir ----------
  function readLog() {
    try {
      const raw = localStorage.getItem(LOG_STORE);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function writeLog(list) {
    try { localStorage.setItem(LOG_STORE, JSON.stringify(list.slice(0, 60))); } catch { /* abaikan */ }
  }

  function renderLog() {
    const list = readLog();
    const rows = list.map((row) => {
      const jam = new Date(row.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      return `<li class="log__row"><span>${escapeHtml(row.nama)}</span><span class="log__time">${jam} · #${row.win}</span></li>`;
    }).join("");
    const empty = '<li class="log__empty">Belum ada yang absen.</li>';
    els.logDosen.innerHTML = rows || empty;
    els.logMhs.innerHTML = rows || empty;
    els.reset.hidden = list.length === 0;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- QR ----------
  let qrReady = typeof window.qrcode === "function";

  function drawQR(text) {
    const canvas = els.qr;
    const ctx = canvas.getContext("2d");
    if (!qrReady) {
      canvas.hidden = true;
      els.qrFallback.hidden = false;
      return;
    }
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const size = canvas.width;
      const cell = size / count;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      for (let r = 0; r < count; r += 1) {
        for (let c = 0; c < count; c += 1) {
          if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    } catch {
      qrReady = false;
      canvas.hidden = true;
      els.qrFallback.hidden = false;
    }
  }

  // ---------- loop tampilan ----------
  let lastWin = null;
  let currentCode = "";

  async function tick() {
    const now = Date.now();
    const win = windowOf(now);
    const remaining = WINDOW_MS - (now % WINDOW_MS);

    if (win !== lastWin) {
      lastWin = win;
      currentCode = await codeFor(win);
      els.kode.textContent = currentCode;
      drawQR(`ABSEN|${currentCode}|${win}`);
    }

    const ratio = Math.max(0, Math.min(1, remaining / WINDOW_MS));
    els.fill.style.transform = `scaleX(${ratio.toFixed(3)})`;
    els.timerText.textContent = `${Math.ceil(remaining / 1000)} detik lagi`;
  }

  els.sesi.textContent = `sesi ${KEY_ID}`;

  // ---------- absen ----------
  function setStatus(text, state) {
    els.status.textContent = text;
    if (state) els.status.dataset.state = state;
    else delete els.status.dataset.state;
  }

  async function submit(event) {
    event.preventDefault();
    const nama = els.nama.value.trim();
    const kode = normalize(els.kodeInput.value);

    els.nama.removeAttribute("aria-invalid");
    els.kodeInput.removeAttribute("aria-invalid");

    if (nama.length < 2) {
      els.nama.setAttribute("aria-invalid", "true");
      els.nama.focus();
      setStatus("Nama belum diisi.", "error");
      return;
    }
    if (kode.length !== 6) {
      els.kodeInput.setAttribute("aria-invalid", "true");
      els.kodeInput.focus();
      setStatus("Kode harus 6 karakter.", "error");
      return;
    }

    els.btnAbsen.disabled = true;
    setStatus("Memeriksa kode…");

    const now = Date.now();
    const win = windowOf(now);
    const [kini, sebelumnya] = await Promise.all([codeFor(win), codeFor(win - 1)]);

    if (kode !== kini && kode !== sebelumnya) {
      els.kodeInput.setAttribute("aria-invalid", "true");
      els.btnAbsen.disabled = false;
      setStatus(kode === normalize(currentCode) ? "Kode sama dengan layar, tapi jendela sudah berganti. Coba lagi." : "Kode tidak cocok atau sudah kedaluwarsa.", "error");
      return;
    }

    const list = readLog();
    const sudah = list.some((r) => r.win === win && r.nama.toLowerCase() === nama.toLowerCase());
    if (sudah) {
      els.btnAbsen.disabled = false;
      setStatus("Nama ini sudah tercatat di jendela ini.", "error");
      return;
    }

    list.unshift({ nama, win, at: now });
    writeLog(list);
    renderLog();

    els.kodeInput.value = "";
    els.btnAbsen.disabled = false;
    const jam = new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setStatus(`Tercatat ${jam}. Kehadiran tersimpan di perangkat ini.`, "ok");
  }

  // ---------- tab ----------
  function pilihTab(peran) {
    const dosen = peran === "dosen";
    $("tab-dosen").setAttribute("aria-selected", String(dosen));
    $("tab-mhs").setAttribute("aria-selected", String(!dosen));
    $("panel-dosen").hidden = !dosen;
    $("panel-mhs").hidden = dosen;
    if (!dosen) els.nama.focus();
  }

  $("tab-dosen").addEventListener("click", () => pilihTab("dosen"));
  $("tab-mhs").addEventListener("click", () => pilihTab("mhs"));
  els.form.addEventListener("submit", submit);
  els.reset.addEventListener("click", () => {
    writeLog([]);
    renderLog();
    setStatus("Daftar dikosongkan.");
  });

  window.addEventListener("storage", renderLog);

  renderLog();
  tick();
  setInterval(tick, 200);
})();
