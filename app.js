'use strict';
(() => {
  const $ = (id) => document.getElementById(id);

  // Accept invitation codes ONLY from #invite=
  function getInvitationCodeFromURL() {
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const code = hashParams.get("invite") || "";

    return /^[a-fA-F0-9]{32}$/.test(code)
      ? code.toLowerCase()
      : "";
  }

  function populateInvitationCode() {
    const codeInput = $("invitation-code");
    const code = getInvitationCodeFromURL();

    if (codeInput && code) {
      codeInput.value = code;
      codeInput.dispatchEvent(
        new Event("input", { bubbles: true })
      );
      codeInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => { populateInvitationCode(); window.addEventListener('hashchange', populateInvitationCode); }
    );
  } else {
    populateInvitationCode();
    window.addEventListener('hashchange', populateInvitationCode);
  }


  const lookupForm = $('lookup-form');
  const responseForm = $('rsvp-form');
  const lookupFields = $('lookup-fields');
  const responseFields = $('response-fields');

  let companionsBox = $('companions');

  if (!companionsBox) {
    companionsBox = document.createElement('div');
    companionsBox.id = 'companions';
    $('guest-role').insertAdjacentElement('afterend', companionsBox);
  }

  companionsBox.className = 'flex flex-col gap-6 mb-4';


  let current = null;
  let busy = false;
  const NOT_FOUND = 'Name not found. Please check spelling or contact the couple.';
  const FRIENDLY_ERRORS = new Set([
    'Invitation could not be verified.',
    'RSVP submissions are closed. Please contact Roger or Janine.',
    'This invitation has changed. Please look it up again before saving.',
    'Choose attending or declining.',
    'Companion count does not match this invitation.',
    'Invalid companion details.',
    'Check companion names and attendance.',
    'Enter the name of each attending companion.',
    'If a companion will attend without you, please contact the couple.'
  ]);
  function message(id, text, kind = '') {
    $(id).textContent = text; // Never insert user/database values using innerHTML.
    $(id).className = `message ${kind}`;
  }
  function cleanName(value, required = true) {
    // Preserve apostrophes, hyphens, accents and non-Latin names.
    // Reject control characters before trimming or normalizing whitespace.
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
      throw new Error('Please enter names without control characters.');
    }
    const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if ([...name].length > 80 || (required && !name)) {
      throw new Error('Please enter a name of 1–80 characters.');
    }
    return name;
  }
  const statusValid = (value) => value === 'attending' || value === 'declining';
  function getMainStatus() {
    return document.querySelector(
      'input[name="main-status"]:checked'
    )?.value || '';
  }

  function setMainStatus(value) {
    const radio = document.querySelector(
      `input[name="main-status"][value="${value}"]`
    );

    if (radio) radio.checked = true;
  }
  const dateLabel = (iso) => new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short'
  }).format(new Date(iso));
  let client;
  try {
    const config = window.WEDDING_CONFIG;
    if (!config || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl) ||
      config.supabaseUrl.includes('YOUR_PROJECT') ||
      !config.supabasePublishableKey || config.supabasePublishableKey.includes('YOUR_') ||
      config.supabasePublishableKey.startsWith('sb_secret_') || !window.supabase) {
      throw new Error('Missing configuration');
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch {
    lookupFields.disabled = true;
    message('lookup-message', 'Online RSVPs are not available yet. Please contact Roger or Janine.', 'error');
    return;
  }
  // No invitation code is stored in localStorage, cookies, URLs or browser logs.

  function addCompanion(index, saved) {

    const box = document.createElement('div');
    box.className = 'rounded-2xl border border-white/10 p-4';

    const title = document.createElement('h3');
    title.textContent = `Companion ${index + 1}`;
    title.className =
      'block font-display text-lg text-white';
    box.append(title);


    const fields = document.createElement('div');

    fields.style.display = 'grid';
    fields.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    fields.style.gap = '16px';

    for (const [key, caption] of [
      ['first_name', 'First name'],
      ['last_name', 'Last name']
    ]) {
      const id = `companion-${index}-${key}`;

      const field = document.createElement('div');
      field.style.display = 'flex';
      field.style.flexDirection = 'column';

      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = caption;
      label.className =
        'block text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2';

      const control = document.createElement('input');
      control.id = id;
      control.type = 'text';
      control.maxLength = 80;
      control.autocomplete = 'off';
      control.className =
        'w-full px-4 py-3 rounded-xl bg-noir-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-gold transition-colors';

      control.value =
        typeof saved?.[key] === 'string'
          ? saved[key]
          : '';

      field.append(label, control);
      fields.append(field);
    }

    box.append(fields);
    companionsBox.append(box);
  }


  function syncNames() {
    if (!current) return;

    const attending = getMainStatus() === 'attending';

    for (let i = 0; i < current.guest.max_plus_ones; i++) {
      const firstName = $(`companion-${i}-first_name`);
      const lastName = $(`companion-${i}-last_name`);

      if (firstName) firstName.required = attending;
      if (lastName) lastName.required = attending;
    }
  }

  function syncMain() {
    syncNames();
  }

  document.querySelectorAll('input[name="main-status"]').forEach(radio => {
    radio.addEventListener('change', syncMain);
  });
  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !lookupForm.reportValidity()) return;
    current = null; responseForm.hidden = true;
    message('lookup-message', ''); message('save-message', '');
    let identity;
    try {
      identity = {
        p_first_name: cleanName($('first-name').value),
        p_last_name: cleanName($('last-name').value),
        p_code: $('invitation-code').value.trim().toLowerCase()
      };
      if (!/^[a-f0-9]{32}$/.test(identity.p_code)) {
        throw new Error('Please enter the 32-character invitation code exactly as shared.');
      }
    } catch (error) { message('lookup-message', error.message, 'error'); return; }
    busy = true; lookupFields.disabled = true;
    $('lookup-button').textContent = 'Finding your invitation…';
    try {
      const { data, error } = await client.rpc('lookup_invitation', identity);
      if (error) throw error;
      if (!data) { message('lookup-message', NOT_FOUND, 'error'); return; }
      if (!Number.isInteger(data.max_plus_ones) || data.max_plus_ones < 0 || data.max_plus_ones > 10 ||
        !Number.isInteger(data.revision) || !Array.isArray(data.plus_ones)) throw new Error('Invalid invitation');
      if (data.rsvp_deadline) {
        // Database cutoff is exclusive. Example: 00:00 Dec 20 means through Dec 19.
        const deadlineNote = $('deadline-note');

        if (deadlineNote && data.rsvp_deadline) {
          deadlineNote.textContent =
            `Please respond before ${dateLabel(data.rsvp_deadline)} (Philippine Time).`;
        }
      }
      if (data.is_open !== true) {
        message('lookup-message', data.rsvp_deadline ?
          'RSVP submissions are closed. Please contact Roger or Janine.' :
          'RSVPs will open once the deadline is confirmed. Please contact Roger or Janine if you need help.');
        return;
      }
      current = { identity, guest: data };
      $('rsvp-guestbook-message').value = '';
      const savedMessage = await client.rpc('get_my_guestbook_message', identity);
      if (savedMessage.error) throw savedMessage.error;
      $('rsvp-guestbook-message').value = savedMessage.data || '';
      $('guest-heading').textContent = `${data.first_name} ${data.last_name} — your response`;
      const roles = [];
      if (data.is_principal_sponsor) roles.push('Principal Sponsor (Ninong / Ninang)');
      if (data.is_entourage) roles.push('Entourage');

      const guestDescription = roles.join(' · ') || 'Wedding guest';

      $('guest-role').textContent = data.max_plus_ones > 0
        ? `${guestDescription} · Additional places reserved: ${data.max_plus_ones}`
        : guestDescription;

      setMainStatus(statusValid(data.rsvp_status) ? data.rsvp_status : 'attending');
      $('companions').replaceChildren();
      for (let i = 0; i < data.max_plus_ones; i++) addCompanion(i, data.plus_ones[i]);
      responseFields.disabled = false;
      responseForm.hidden = false;
      lookupForm.hidden = true;
      $('invitation-code').value = '';
      syncMain();
      document.querySelector('input[name="main-status"]:checked')?.focus();
      message('lookup-message', '');
    } catch (error) {
      console.error('RSVP LOOKUP ERROR:', error);

      message(
        'lookup-message',
        'Lookup failed. Please open the browser console to see the error.',
        'error'
      );
    } finally {
      busy = false; lookupFields.disabled = false;
      $('lookup-button').textContent = 'Find my invitation';
    }
  });
  responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !current || !responseForm.reportValidity()) return;
    message('save-message', '');
    let companions;
    const status = getMainStatus();
    try {
      if (!statusValid(status)) throw new Error('Choose attending or declining.');

      companions = Array.from({ length: current.guest.max_plus_ones }, (_, i) => {
        return {
          first_name: cleanName(
            $(`companion-${i}-first_name`).value,
            status === 'attending'
          ),
          last_name: cleanName(
            $(`companion-${i}-last_name`).value,
            status === 'attending'
          ),
          status: status
        };
      });

    } catch (error) { message('save-message', error.message, 'error'); return; }
    busy = true; responseFields.disabled = true; $('reset-button').disabled = true;
    $('save-button').textContent = 'Saving your response…';
    try {
      const { data, error } = await client.rpc('submit_rsvp_with_message', {
        ...current.identity, p_status: status, p_plus_ones: companions,
        p_revision: current.guest.revision,
        p_message: $('rsvp-guestbook-message').value.trim()
      });
      if (error) throw error;
      if (data?.saved !== true || !Number.isInteger(data.revision)) throw new Error('Save not confirmed');
      current.guest.revision = data.revision;
      current.guest.rsvp_status = status; current.guest.plus_ones = companions;

      // Show RSVP confirmation modal after successful save
      const modal = document.getElementById('rsvpModal');

      if (modal) {
        const fullName =
          `${current.guest.first_name} ${current.guest.last_name}`;

        const guestCount = status === 'attending'
          ? 1 + companions.filter(c => c.status === 'attending').length
          : 0;

        const confirmName = document.getElementById('confirmName');
        const confirmStatus = document.getElementById('confirmStatus');
        const confirmGuests = document.getElementById('confirmGuests');

        if (confirmName) confirmName.textContent = fullName;

        if (confirmStatus) {
          confirmStatus.textContent =
            status === 'attending' ? 'Attending' : 'Declining';
        }

        if (confirmGuests) {
          confirmGuests.textContent = guestCount;
        }

        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
      }

      if (typeof window.refreshWeddingCommunity === 'function')
        window.refreshWeddingCommunity();

      message('save-message', '');

    } catch (error) {
      message('save-message', FRIENDLY_ERRORS.has(error.message) ? error.message :
        'We couldn’t confirm that your response was saved. Please find your invitation again to check before retrying.', 'error');
    } finally {
      busy = false; responseFields.disabled = false; $('reset-button').disabled = false;
      $('save-button').textContent = 'Send our response';
      syncMain();
    }
  });
  $('reset-button').addEventListener('click', () => {
    if (busy) return;

    current = null;
    $('companions').replaceChildren();
    responseForm.reset();

    responseForm.hidden = true;
    lookupForm.hidden = false;
    lookupForm.reset();

    // Restore invitation code from the URL
    populateInvitationCode();

    message('save-message', '');
    message('lookup-message', '');

    $('first-name').focus();
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (event) {
      const targetId = this.getAttribute('href');

      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });


})();


// Initialize Lucide Icons
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  loadGuestbook();
  refreshRSVPViewer();
});

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


let toastTimeout = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  if (!toast || !toastMsg) return;

  // Cancel the previous timer
  if (toastTimeout !== null) {
    clearTimeout(toastTimeout);
  }

  // Update the message
  toastMsg.textContent = msg;

  // Show the toast
  toast.classList.remove('translate-x-full');

  // Hide after 6 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.add('translate-x-full');
    toastTimeout = null;
  }, 6000);
}

/* ===================================================
   5. RSVP FORM SYSTEM & LOCALSTORAGE
   =================================================== */
function handleRSVPSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('rsvpName').value.trim();
  const status = document.getElementById('rsvpStatus').value;
  const guests = document.getElementById('rsvpGuests').value;
  const message = document.getElementById('rsvpMessage').value;

  const rsvpData = {
    name, status, guests, message, timestamp: new Date().toISOString()
  };

  // Save to LocalStorage
  let existingRSVPs = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');
  existingRSVPs.push(rsvpData);
  localStorage.setItem('wedding_rsvps', JSON.stringify(existingRSVPs));


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
/* ===================================================
   5b. LOCALSTORAGE INSPECTOR & HELPER FUNCTIONS
   =================================================== */
function refreshRSVPViewer() {
  const viewer = document.getElementById('localStorageViewer');
  const badge = document.getElementById('rsvpCounterBadge');
  const rsvps = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');

  if (badge) {
    badge.innerText = `${rsvps.length} ${rsvps.length === 1 ? 'Entry' : 'Entries'}`;
  }

  if (!viewer) return;

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
  if (window.lucide) {
    lucide.createIcons();
  }
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
  if (modal) {
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
  }

  // Reuse the Supabase RSVP form's existing reset handler.
  // The reset button stays in the DOM but is hidden from guests.
  const resetButton = document.getElementById('reset-button');
  if (resetButton) resetButton.click();

  document.getElementById('rsvp')?.scrollIntoView({
    behavior: 'smooth', block: 'start'
  });

  // Show success notification after closing the modal
  showToast(
    'Your response has been saved. We’re looking forward to celebrating with you! — Roger & Janine'
  );
}



/* ===================================================
   6. PUBLIC WEDDING COMMUNITY (SUPABASE RPC)
   =================================================== */
let communityClient = null;
try {
  const config = window.WEDDING_CONFIG;
  if (window.supabase && config?.supabaseUrl && config?.supabasePublishableKey &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl) &&
    !config.supabasePublishableKey.startsWith('sb_secret_')) {
    communityClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
} catch (error) { console.error('Community initialization failed:', error); }

// Format displayed names without changing the names saved in Supabase.
function formatGuestName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator, letter) =>
      separator + letter.toUpperCase());
}

async function loadGuestbook() {
  const feed = document.getElementById('guestbookFeed');
  const list = document.getElementById('accepted-guest-list');
  const count = document.getElementById('accepted-count');
  if (!feed || !list || !count) return;
  if (!communityClient) {
    count.textContent = 'Community unavailable';
    feed.textContent = 'The guestbook is temporarily unavailable.';
    return;
  }
  try {
    const { data, error } = await communityClient.rpc('get_wedding_community');
    if (error) throw error;
    const guests = Array.isArray(data?.guests) ? data.guests : [];
    const notes = Array.isArray(data?.messages) ? data.messages : [];
    const total = Number(data?.attendee_count) || 0;
    count.hidden = true;
    list.replaceChildren();
    for (const guest of guests) {
      const item = document.createElement('div');

      // No background, border, or rounded container
      item.className = 'flex items-start gap-2 py-2 text-sm text-ivory-200';

      // Gold person icon
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'user-round');
      icon.className = 'w-4 h-4 text-gold shrink-0 mt-0.5';

      // Keep guest and companions together
      const names = document.createElement('span');
      names.className = 'text-sm text-white leading-relaxed';

      const mainName = document.createElement('span');
      mainName.className = 'font-medium text-white';
      mainName.textContent = formatGuestName(guest.name || 'Guest');

      names.append(mainName);

      const companions = Array.isArray(guest.companions)
        ? guest.companions
        : [];

      if (companions.length) {
        const beside = document.createElement('span');
        beside.className = 'text-ivory-300';
        beside.textContent =
          '  ·  ' + companions.map(formatGuestName).join(', ');

        names.append(beside);
      }

      item.append(icon, names);
      list.append(item);
    }

    // Initialize dynamically created icons
    if (window.lucide) {
      lucide.createIcons();
    }

    if (!guests.length) list.textContent = 'No accepted RSVPs yet.';
    feed.replaceChildren();
    for (const note of notes) {
      const card = document.createElement('div');
      card.className = 'rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2';
      const name = document.createElement('h4');
      name.className = 'text-white text-sm';
      name.textContent = formatGuestName(note.author || 'Guest');
      const body = document.createElement('p');
      body.className =
        'text-ivory-200 text-sm font-serif italic leading-relaxed whitespace-pre-wrap';

      body.textContent = `“${String(note.content || '').trim()}”`;

      card.append(name, body);
      feed.append(card);
    }
    if (!notes.length) feed.textContent = 'Be the first to leave a heartfelt message with your RSVP.';
  } catch (error) {
    console.error('Wedding community fetch error:', error);
    count.textContent = 'Could not load accepted guests';
    feed.textContent = 'Could not load guestbook messages. Please try again later.';
  }
}
window.refreshWeddingCommunity = loadGuestbook;
window.setInterval(() => {
  if (document.visibilityState === 'visible') loadGuestbook();
}, 10000);

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

function openDressCodeModal() {
  const modal = document.getElementById('dressCodeModal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeDressCodeModal() {
  const modal = document.getElementById('dressCodeModal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

// Close when clicking outside the modal
document.getElementById('dressCodeModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'dressCodeModal') {
    closeDressCodeModal();
  }
});

// Close with Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDressCodeModal();
  }
});

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