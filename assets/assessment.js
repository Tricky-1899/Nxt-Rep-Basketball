// Free assessment booking form (/assessment).
// Sends the booking to FormSubmit, which emails it to info@nxtrepbasketball.com.au.
// Loaded with `defer` from the page <head>, so the form exists before this runs.
(function () {
  'use strict';

  var ENDPOINT = 'https://formsubmit.co/ajax/info@nxtrepbasketball.com.au';
  var TIMEOUT_MS = 15000;      // give up on a stalled request instead of spinning forever
  var MIN_FILL_MS = 3000;      // humans take longer than 3s to fill this in; bots don't

  var form = document.getElementById('assessForm');
  var errorBox = document.getElementById('formError');
  var btn = document.getElementById('submitBtn');
  var success = document.getElementById('successMsg');

  // Guard: if the page markup changes and an element goes missing, stop quietly
  // rather than throwing and leaving a dead form.
  if (!form || !errorBox || !btn || !success) return;

  var loadedAt = Date.now();
  var sending = false;
  var BTN_LABEL = btn.textContent;

  // Field rules. Labels are used in error messages.
  var FIELDS = [
    { id: 'parentName', label: 'your name' },
    { id: 'mobile', label: 'your mobile', check: validMobile, bad: 'Please check your mobile number.' },
    { id: 'email', label: 'your email', check: validEmail, bad: 'Please check your email address.' },
    { id: 'childName', label: "the player's first name" },
    { id: 'childAge', label: "the player's age" },
    { id: 'level', label: 'their current level' },
    { id: 'format', label: 'what you’re interested in' },
    { id: 'suburb', label: 'your suburb' }
  ];

  function el(id) { return document.getElementById(id); }

  // Read a field: trim it and strip control characters (incl. line breaks in
  // one-line fields). Stops someone smuggling extra lines into the email subject.
  function val(id, multiline) {
    var node = el(id);
    if (!node) return '';
    var v = String(node.value || '').trim();
    return multiline
      ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      : v.replace(/[\u0000-\u001F\u007F]+/g, ' ');
  }

  function validEmail(v) {
    return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  // Accepts Australian mobiles/landlines in any common format:
  // 0412 345 678, +61 412 345 678, (02) 9123 4567 ...
  function validMobile(v) {
    var digits = v.replace(/\D/g, '');
    return /^[+\d\s()-]+$/.test(v) && digits.length >= 8 && digits.length <= 12;
  }

  // Errors are written with textContent, never innerHTML, so nothing typed into
  // the form can ever be turned into HTML on the page (XSS-safe by design).
  function showError(message, withEmailLink) {
    errorBox.textContent = message;
    if (withEmailLink) {
      var a = document.createElement('a');
      a.href = 'mailto:info@nxtrepbasketball.com.au';
      a.textContent = 'info@nxtrepbasketball.com.au';
      errorBox.appendChild(document.createTextNode(' Or email '));
      errorBox.appendChild(a);
      errorBox.appendChild(document.createTextNode('.'));
    }
    errorBox.style.display = 'block';
  }

  function clearErrors() {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    FIELDS.forEach(function (f) { var n = el(f.id); if (n) n.removeAttribute('aria-invalid'); });
  }

  function flag(id, message) {
    var n = el(id);
    if (n) { n.setAttribute('aria-invalid', 'true'); n.focus(); }
    showError(message);
  }

  function setSending(on) {
    sending = on;
    btn.disabled = on;
    btn.textContent = on ? 'Booking…' : BTN_LABEL;
  }

  function showSuccess() {
    form.style.display = 'none';
    success.style.display = 'block';
    success.setAttribute('tabindex', '-1');
    success.focus();   // screen readers announce the confirmation
    try { success.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* old browsers */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;           // ignore double-clicks / double Enter
    clearErrors();

    // Spam trap 1: hidden field real people never see or fill in.
    // Spam trap 2: submitted faster than a person could type.
    // Either way, pretend it worked so bots don't learn to adapt.
    var honey = el('website');
    if ((honey && honey.value) || Date.now() - loadedAt < MIN_FILL_MS) {
      showSuccess();
      return;
    }

    // Required fields, in on-screen order, so focus lands on the first problem.
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      var v = val(f.id);
      if (!v) { flag(f.id, 'Please add ' + f.label + '. Only the notes box is optional.'); return; }
      if (f.check && !f.check(v)) { flag(f.id, f.bad); return; }
    }

    if (navigator.onLine === false) {
      showError('You seem to be offline. Check your connection and try again.', true);
      return;
    }

    var consent = el('consent');
    var payload = {
      'Parent name': val('parentName'),
      'Mobile': val('mobile'),
      'Email': val('email'),
      'Player': val('childName'),
      'Age': val('childAge'),
      'Level': val('level'),
      'Interested in': val('format'),
      'Suburb': val('suburb'),
      'Notes': val('goals', true),
      'Marketing consent': consent && consent.checked ? 'YES - opted in to email/SMS updates' : 'No',
      _subject: ('Free assessment: ' + val('childName') + ' (' + val('childAge') + ', ' + val('suburb') + ')').slice(0, 150),
      _replyto: val('email'),
      _template: 'table',
      _honey: ''                    // FormSubmit's own spam field; must stay empty
    };

    // Abort a stalled request so the button can't stay on "Booking…" forever.
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    setSending(true);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) {
        // A 4xx/5xx often comes back as an HTML error page; don't try to parse it as JSON.
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (d && (d.success === true || d.success === 'true')) { showSuccess(); return; }
        throw new Error((d && d.message) || 'FormSubmit rejected the submission');
      })
      .catch(function (err) {
        // Log the real reason for debugging; show the parent a plain message.
        if (window.console) console.error('Assessment form failed:', err);
        var timedOut = err && err.name === 'AbortError';
        showError(timedOut
          ? 'That took too long to send. Please try again.'
          : 'Sorry, that didn’t send. Please try again.', true);
        setSending(false);
      })
      .then(function () { if (timer) clearTimeout(timer); });
  });
})();
