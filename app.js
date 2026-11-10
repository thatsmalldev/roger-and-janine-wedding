


// Initialize Lucide Icons
lucide.createIcons();

/* ===================================================
   1. LIVE COUNTDOWN TIMER TO FEB 6, 2027 3:00 PM PH TIME
   =================================================== */
// Target Date: Feb 6, 2027 15:00:00 UTC+8 (PH Time)
const targetDate = new Date('2027-02-06T15:00:00+08:00').getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const distance = targetDate - now;

  if (distance < 0) {
    document.getElementById('days').innerText = '00';
    document.getElementById('hours').innerText = '00';
    document.getElementById('minutes').innerText = '00';
    document.getElementById('seconds').innerText = '00';
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById('days').innerText = String(days).padStart(2, '0');
  document.getElementById('hours').innerText = String(hours).padStart(2, '0');
  document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
  document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

/* ===================================================
   2. LIGHTBOX PHOTO GALLERY
   =================================================== */
const galleryItems = [
  { src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1200", caption: "Sunset by the Coast — Pre-Wedding Shoot" },
  { src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1200", caption: "Elegance in Motion — Pre-Wedding Shoot" },
  { src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=1200", caption: "Under Starlit Skies — Engagement Night" },
  { src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1200", caption: "Quiet Moments — Coffee & Smiles" },
  { src: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=1200", caption: "Looking Toward Tomorrow — Formal Portraits" },
  { src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=1200", caption: "Floral Whispers — Bouquet & Details" }
];

let currentLightboxIdx = 0;

function openLightbox(idx) {
  currentLightboxIdx = idx;
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');

  img.src = galleryItems[idx].src;
  caption.innerText = galleryItems[idx].caption;

  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.add('opacity-100', 'pointer-events-auto');
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  modal.classList.remove('opacity-100', 'pointer-events-auto');
  modal.classList.add('opacity-0', 'pointer-events-none');
}

function nextLightbox() {
  currentLightboxIdx = (currentLightboxIdx + 1) % galleryItems.length;
  openLightbox(currentLightboxIdx);
}

function prevLightbox() {
  currentLightboxIdx = (currentLightboxIdx - 1 + galleryItems.length) % galleryItems.length;
  openLightbox(currentLightboxIdx);
}

/* ===================================================
   3. EVENT DETAIL & GIFT MODALS
   =================================================== */
function openEventDetailModal() {
  const m = document.getElementById('eventDetailModal');
  m.classList.remove('opacity-0', 'pointer-events-none');
  m.classList.add('opacity-100', 'pointer-events-auto');
}

function closeEventDetailModal() {
  const m = document.getElementById('eventDetailModal');
  m.classList.remove('opacity-100', 'pointer-events-auto');
  m.classList.add('opacity-0', 'pointer-events-none');
}

function openGiftModal() {
  const m = document.getElementById('giftModal');
  m.classList.remove('opacity-0', 'pointer-events-none');
  m.classList.add('opacity-100', 'pointer-events-auto');
}

function closeGiftModal() {
  const m = document.getElementById('giftModal');
  m.classList.remove('opacity-100', 'pointer-events-auto');
  m.classList.add('opacity-0', 'pointer-events-none');
}

/* ===================================================
   4. COPY TO CLIPBOARD HELPER & TOAST
   =================================================== */
function copyToClipboard(text, label) {
  const dummy = document.createElement('textarea');
  document.body.appendChild(dummy);
  dummy.value = text;
  dummy.select();
  document.execCommand('copy');
  document.body.removeChild(dummy);

  showToast(`Copied ${label} to clipboard!`);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').innerText = msg;
  toast.classList.remove('translate-x-full');
  setTimeout(() => {
    toast.classList.add('translate-x-full');
  }, 3000);
}

/* ===================================================
   5. RSVP FORM SYSTEM & LOCALSTORAGE
   =================================================== */
function handleRSVPSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('rsvpName').value.trim();
  const status = document.getElementById('rsvpStatus').value;
  const guests = document.getElementById('rsvpGuests').value;
  const dietary = document.getElementById('rsvpDietary').value;
  const song = document.getElementById('rsvpSong').value;
  const message = document.getElementById('rsvpMessage').value;

  const rsvpData = {
    name, status, guests, dietary, song, message, timestamp: new Date().toISOString()
  };

  // Save to LocalStorage
  let existingRSVPs = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');
  existingRSVPs.push(rsvpData);
  localStorage.setItem('wedding_rsvps', JSON.stringify(existingRSVPs));

  // Also add message to guestbook if provided
  if (message) {
    saveGuestbookEntry(name, "Guest", message);
  }

  // Display Modal Confirmation
  document.getElementById('confirmName').innerText = name;
  document.getElementById('confirmStatus').innerText = status;
  document.getElementById('confirmGuests').innerText = guests;

  // Update Inspector UI
  refreshRSVPViewer();

  const modal = document.getElementById('rsvpModal');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.add('opacity-100', 'pointer-events-auto');

  // Reset form
  document.getElementById('rsvpForm').reset();
}

/* ===================================================
   5b. LOCALSTORAGE INSPECTOR & HELPER FUNCTIONS
   =================================================== */
function refreshRSVPViewer() {
  const viewer = document.getElementById('localStorageViewer');
  const badge = document.getElementById('rsvpCounterBadge');
  const rsvps = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');

  badge.innerText = `${rsvps.length} ${rsvps.length === 1 ? 'Entry' : 'Entries'}`;

  if (rsvps.length === 0) {
    viewer.innerHTML = `<p class="text-ivory-300/40 text-xs text-center py-6 italic font-serif">No RSVPs stored yet. Fill out the form above to see entries populate here!</p>`;
    return;
  }

  viewer.innerHTML = '';
  rsvps.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = "p-3 bg-noir-800 rounded-xl border border-white/5 space-y-1 text-xs";
    div.innerHTML = `
      <div class="flex justify-between items-center text-white font-medium">
        <span>#${index + 1} ${escapeHTML(item.name)}</span>
        <span class="text-gold text-[10px] uppercase font-mono">${escapeHTML(item.status)}</span>
      </div>
      <div class="text-[11px] text-ivory-300/70 flex justify-between">
        <span>Guests: ${item.guests} | Dietary: ${escapeHTML(item.dietary || 'None')}</span>
        <span class="text-ivory-300/40 text-[9px] font-mono">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    viewer.appendChild(div);
  });
  lucide.createIcons();
}

function clearRSVPLocalStorage() {
  if (confirm("Are you sure you want to clear all stored RSVP entries?")) {
    localStorage.removeItem('wedding_rsvps');
    refreshRSVPViewer();
    showToast("RSVP LocalStorage cleared!");
  }
}

/* ===================================================
   5c. EXPORT RSVPs TO EXCEL (CSV FILE GENERATOR)
   =================================================== */
function exportRSVPToExcel() {
  const rsvps = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');

  if (rsvps.length === 0) {
    showToast("No RSVP entries to export yet!");
    return;
  }

  // 1. Define Excel CSV Headers
  const headers = ["#", "Name", "Status", "Guests", "Dietary Restrictions", "Song Request", "Message", "Submission Time"];

  // 2. Format rows as CSV string
  const csvRows = [headers.join(",")];

  rsvps.forEach((item, idx) => {
    const row = [
      idx + 1,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.status || '').replace(/"/g, '""')}"`,
      `"${(item.guests || '').replace(/"/g, '""')}"`,
      `"${(item.dietary || '').replace(/"/g, '""')}"`,
      `"${(item.song || '').replace(/"/g, '""')}"`,
      `"${(item.message || '').replace(/"/g, '""')}"`,
      `"${new Date(item.timestamp).toLocaleString()}"`
    ];
    csvRows.push(row.join(","));
  });

  const csvString = "\uFEFF" + csvRows.join("\n"); // UTF-8 BOM for Excel special character support

  // 3. Trigger automatic browser file download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Roger_Janine_Wedding_RSVP_List_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("RSVP list exported to Excel CSV successfully!");
}

function closeRSVPModal() {
  const modal = document.getElementById('rsvpModal');
  modal.classList.remove('opacity-100', 'pointer-events-auto');
  modal.classList.add('opacity-0', 'pointer-events-none');
}

/* ===================================================
   6. LIVE GUESTBOOK (LOCALSTORAGE)
   =================================================== */
const defaultNotes = [
  { author: "Auntie Clara", location: "Vancouver, Canada", text: "Wishing you both a lifetime of happiness, endless laughter, and divine blessings!", time: "2 days ago", likes: 5 },
  { author: "Mark & Sarah", location: "Quezon City", text: "Can't wait to celebrate on the dance floor! So happy for you two!", time: "1 week ago", likes: 8 }
];

function loadGuestbook() {
  const stored = localStorage.getItem('wedding_guestbook');
  let notes = stored ? JSON.parse(stored) : defaultNotes;
  renderGuestbookFeed(notes);
}

function renderGuestbookFeed(notes) {
  const feed = document.getElementById('guestbookFeed');
  feed.innerHTML = '';

  if (notes.length === 0) {
    feed.innerHTML = `<p class="text-center text-ivory-300/50 text-xs py-8">Be the first to leave a sweet note!</p>`;
    return;
  }

  notes.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = "glass-dark p-6 rounded-2xl border border-white/10 space-y-3 hover:border-gold/30 transition-all";
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-display text-white font-medium">${escapeHTML(item.author)}</h4>
          <span class="text-[11px] text-gold font-mono uppercase">${escapeHTML(item.location || 'Friend')}</span>
        </div>
        <span class="text-[10px] text-ivory-300/60 font-mono">${item.time || 'Recently'}</span>
      </div>
      <p class="text-ivory-200 text-sm font-serif leading-relaxed">"${escapeHTML(item.text)}"</p>
      <div class="flex items-center justify-end gap-2 pt-2 text-xs text-ivory-300">
        <button onclick="likeGuestbookNote(${index})" class="hover:text-gold flex items-center gap-1 transition-colors">
          <i data-lucide="heart" class="w-3.5 h-3.5 text-gold"></i>
          <span>${item.likes || 0}</span>
        </button>
      </div>
    `;
    feed.appendChild(card);
  });

  lucide.createIcons();
}

function saveGuestbookEntry(author, location, text) {
  let notes = JSON.parse(localStorage.getItem('wedding_guestbook') || JSON.stringify(defaultNotes));
  notes.unshift({
    author: author,
    location: location || "Dear Friend",
    text: text,
    time: "Just now",
    likes: 1
  });
  localStorage.setItem('wedding_guestbook', JSON.stringify(notes));
  renderGuestbookFeed(notes);
}

function addGuestbookNote() {
  const author = document.getElementById('gbAuthor').value.trim();
  const location = document.getElementById('gbLocation').value.trim();
  const content = document.getElementById('gbContent').value.trim();

  if (!author || !content) {
    showToast("Please enter your name and note!");
    return;
  }

  saveGuestbookEntry(author, location, content);

  document.getElementById('gbAuthor').value = '';
  document.getElementById('gbLocation').value = '';
  document.getElementById('gbContent').value = '';

  showToast("Thank you for your warm note!");
}

function likeGuestbookNote(index) {
  let notes = JSON.parse(localStorage.getItem('wedding_guestbook') || JSON.stringify(defaultNotes));
  notes[index].likes = (notes[index].likes || 0) + 1;
  localStorage.setItem('wedding_guestbook', JSON.stringify(notes));
  renderGuestbookFeed(notes);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ===================================================
   7. SOFT SYNTH AMBIENT BACKGROUND PLAYER (WEB AUDIO API)
   =================================================== */
let audioCtx = null;
let isSynthPlaying = false;
let synthInterval = null;

// Romantic Chord Progression Frequencies (Hz)
// Cmaj7 -> Am7 -> Fmaj7 -> G7sus4
const chordProgression = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7
  [220.00, 261.63, 329.63, 392.00], // Am7
  [174.61, 220.00, 261.63, 329.63], // Fmaj7
  [196.00, 261.63, 293.66, 392.00]  // G7sus4
];

let currentChordIdx = 0;

function playChord(chordFreqs) {
  if (!audioCtx || audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const duration = 4.5; // Seconds per chord transition

  chordFreqs.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine'; // Soft warm sine wave
    osc.frequency.setValueAtTime(freq, now);

    // Soft Attack and Fade Out Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  });
}

function toggleSynthMusic() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (!isSynthPlaying) {
    isSynthPlaying = true;
    document.getElementById('synthLabel').innerText = 'Pause Ambient Sound';
    document.getElementById('soundPulse').classList.remove('hidden');

    // Play initial chord
    playChord(chordProgression[currentChordIdx]);

    // Loop through chords
    synthInterval = setInterval(() => {
      currentChordIdx = (currentChordIdx + 1) % chordProgression.length;
      playChord(chordProgression[currentChordIdx]);
    }, 4500);

    showToast("Playing soft romantic background music...");
  } else {
    isSynthPlaying = false;
    clearInterval(synthInterval);
    document.getElementById('synthLabel').innerText = 'Play Ambient Music';
    document.getElementById('soundPulse').classList.add('hidden');
    showToast("Music paused");
  }
}



/* ----------------------------------------------------
           2. Ambient Dust Particle Canvas
---------------------------------------------------- */
const canvas = document.getElementById('ambient-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const particles = Array.from({ length: 35 }).map(() => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  radius: Math.random() * 2 + 1,
  speedY: Math.random() * 0.8 + 0.3,
  opacity: Math.random() * 0.5 + 0.2
}));

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.y -= p.speedY;
    if (p.y < 0) {
      p.y = canvas.height;
      p.x = Math.random() * canvas.width;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
    ctx.fill();
  });

  requestAnimationFrame(animateParticles);
}
animateParticles();


// Initialize Page
function initializePage() {
  loadGuestbook();
  refreshRSVPViewer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}