'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const lookupForm = $('lookup-form');
  const responseForm = $('rsvp-form');
  const lookupFields = $('lookup-fields');
  const responseFields = $('response-fields');
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
  const dateLabel = (iso) => new Intl.DateTimeFormat('en-PH', {
    timeZone:'Asia/Manila',dateStyle:'long',timeStyle:'short'
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
      auth: {persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
  } catch {
    lookupFields.disabled = true;
    message('lookup-message', 'Online RSVPs are not available yet. Please contact Roger or Janine.', 'error');
    return;
  }
  // No invitation code is stored in localStorage, cookies, URLs or browser logs.
  function addCompanion(index, saved) {
    const box = document.createElement('div');
    box.className = 'companion';
    const title = document.createElement('h3');
    title.textContent = `Companion ${index + 1}`;
    box.append(title);
    for (const [key, caption] of [['first_name','First name'],['last_name','Last name'],['status','Will this companion attend?']]) {
      const id = `companion-${index}-${key}`;
      const label = document.createElement('label');
      label.htmlFor = id; label.textContent = caption;
      const control = document.createElement(key === 'status' ? 'select' : 'input');
      control.id = id;
      if (key === 'status') {
        for (const [value, text] of [['','Please select'],['attending','Attending'],['declining','Declining / place unused']]) {
          const option = document.createElement('option');
          option.value = value; option.textContent = text; control.append(option);
        }
        control.required = true;
        control.value = statusValid(saved?.status) ? saved.status : '';
        control.addEventListener('change', syncNames);
      } else {
        control.maxLength = 80; control.autocomplete = 'off';
        control.value = typeof saved?.[key] === 'string' ? saved[key] : '';
      }
      box.append(label,control);
    }
    $('companions').append(box);
  }
  function syncNames() {
    if (!current) return;
    for (let i = 0; i < current.guest.max_plus_ones; i++) {
      const attending = $(`companion-${i}-status`).value === 'attending';
      $(`companion-${i}-first_name`).required = attending;
      $(`companion-${i}-last_name`).required = attending;
    }
  }
  function syncMain() {
    if (!current) return;
    const declining = $('main-status').value === 'declining';
    for (let i = 0; i < current.guest.max_plus_ones; i++) {
      const status = $(`companion-${i}-status`);
      if (declining) status.value = 'declining';
      status.disabled = declining;
    }
    syncNames();
  }
  $('main-status').addEventListener('change', syncMain);
  
// ===================================
// INVITATION CODE URL CONFIGURATION
// ===================================

const invitationParams = new URLSearchParams(
    window.location.hash.slice(1)
);


  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !lookupForm.reportValidity()) return;
    current = null; responseForm.hidden = true;
    message('lookup-message',''); message('save-message','');
    let identity;
    try {
      identity = {
        p_first_name:cleanName($('first-name').value),
        p_last_name:cleanName($('last-name').value),
        p_code:$('invitation-code').value.trim().toLowerCase()
      };
      if (!/^[a-f0-9]{32}$/.test(identity.p_code)) {
        throw new Error('Please enter the 32-character invitation code exactly as shared.');
      }
    } catch (error) { message('lookup-message',error.message,'error'); return; }
    busy = true; lookupFields.disabled = true;
    $('lookup-button').textContent = 'Finding your invitation…';
    try {
      const {data,error} = await client.rpc('lookup_invitation',identity);
      if (error) throw error;
      if (!data) { message('lookup-message',NOT_FOUND,'error'); return; }
      if (!Number.isInteger(data.max_plus_ones) || data.max_plus_ones < 0 || data.max_plus_ones > 10 ||
          !Number.isInteger(data.revision) || !Array.isArray(data.plus_ones)) throw new Error('Invalid invitation');
      if (data.rsvp_deadline) {
        // Database cutoff is exclusive. Example: 00:00 Dec 20 means through Dec 19.
        $('deadline-note').textContent = `Please respond before ${dateLabel(data.rsvp_deadline)} (Philippine Time).`;
      }
      if (data.is_open !== true) {
        message('lookup-message', data.rsvp_deadline ?
          'RSVP submissions are closed. Please contact Roger or Janine.' :
          'RSVPs will open once the deadline is confirmed. Please contact Roger or Janine if you need help.');
        return;
      }
      current = {identity,guest:data};
      $('guest-heading').textContent = `${data.first_name} ${data.last_name} — your response`;
      const roles = [];
      if (data.is_principal_sponsor) roles.push('Principal Sponsor (Ninong / Ninang)');
      if (data.is_entourage) roles.push('Entourage');
      $('guest-role').textContent = `${roles.join(' · ') || 'Wedding guest'} · Additional places reserved: ${data.max_plus_ones}`;
      $('main-status').value = statusValid(data.rsvp_status) ? data.rsvp_status : '';
      $('companions').replaceChildren();
      for (let i = 0; i < data.max_plus_ones; i++) addCompanion(i,data.plus_ones[i]);
      responseFields.disabled = false;
      responseForm.hidden = false;
      lookupForm.hidden = true;
      $('invitation-code').value = '';
      syncMain();
      $('main-status').focus();
      message('lookup-message',data.rsvp_status === 'pending' ? 'Your invitation is ready.' : 'Your saved response is shown below. You may update it while RSVPs are open.');
    } catch {
      message('lookup-message','We couldn’t reach the RSVP service. Please try again later or contact Roger or Janine.','error');
    } finally {
      busy = false; lookupFields.disabled = false;
      $('lookup-button').textContent = 'Find my invitation';
    }
  });
  responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !current || !responseForm.reportValidity()) return;
    message('save-message','');
    let companions;
    const status = $('main-status').value;
    try {
      if (!statusValid(status)) throw new Error('Choose attending or declining.');
      companions = Array.from({length:current.guest.max_plus_ones},(_,i) => {
        const attendance = $(`companion-${i}-status`).value;
        if (!statusValid(attendance)) throw new Error('Choose attending or declining for each companion.');
        if (status === 'declining' && attendance !== 'declining') throw new Error('Please contact us if a companion will attend without you.');
        return {
          first_name:cleanName($(`companion-${i}-first_name`).value,attendance === 'attending'),
          last_name:cleanName($(`companion-${i}-last_name`).value,attendance === 'attending'),
          status:attendance
        };
      });
    } catch (error) {message('save-message',error.message,'error');return;}
    busy = true; responseFields.disabled = true; $('reset-button').disabled = true;
    $('save-button').textContent = 'Saving your response…';
    try {
      const {data,error} = await client.rpc('submit_rsvp',{
        ...current.identity,p_status:status,p_plus_ones:companions,p_revision:current.guest.revision
      });
      if (error) throw error;
      if (data?.saved !== true || !Number.isInteger(data.revision)) throw new Error('Save not confirmed');
      current.guest.revision = data.revision;
      current.guest.rsvp_status = status; current.guest.plus_ones = companions;
      message('save-message', status === 'attending' ?
        'Your response has been saved. We’re looking forward to celebrating with you! — Roger & Janine' :
        'Your response has been saved. We’ll miss you, and we’re grateful for your love and prayers. — Roger & Janine','success');
    } catch (error) {
      message('save-message',FRIENDLY_ERRORS.has(error.message) ? error.message :
        'We couldn’t confirm that your response was saved. Please find your invitation again to check before retrying.','error');
    } finally {
      busy = false; responseFields.disabled = false; $('reset-button').disabled = false;
      $('save-button').textContent = 'Send our response';
      syncMain();
    }
  });
  $('reset-button').addEventListener('click',() => {
    if (busy) return;
    current = null; $('companions').replaceChildren(); responseForm.reset();
    responseForm.hidden = true; lookupForm.hidden = false; lookupForm.reset();
    message('save-message','');message('lookup-message','');$('first-name').focus();
  });
  const params = new URLSearchParams(
    window.location.search
);
})();
