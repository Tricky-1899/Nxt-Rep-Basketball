// Shared form helpers for the site's two forms (/assessment and /contact).
// One copy of the validation, spam checks and sending logic, so a fix here
// fixes both forms. Load this BEFORE the page's own form script (both `defer`).
(function () {
  'use strict';

  var ENDPOINT = 'https://formsubmit.co/ajax/info@nxtrepbasketball.com.au';
  var EMAIL = 'info@nxtrepbasketball.com.au';
  var TIMEOUT_MS = 15000;   // give up on a stalled request instead of spinning forever
  var MIN_FILL_MS = 3000;   // people take longer than 3s to fill a form in; bots don't

  // One-line fields: trim and turn control characters (incl. line breaks) into
  // spaces. Stops anyone smuggling extra lines into the email subject.
  function line(node) {
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    return node ? String(node.value || '').trim().replace(/[\u0000-\u001F\u007F]+/g, ' ') : '';
  }

  // Multi-line fields: keep line breaks, drop other control characters.
  function text(node) {
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    return node ? String(node.value || '').trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : '';
  }

  function validEmail(v) {
    return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  // Australian mobiles/landlines in any common format:
  // 0412 345 678, +61 412 345 678, (02) 9123 4567 ...
  function validPhone(v) {
    var digits = v.replace(/\D/g, '');
    return /^[+\d\s()-]+$/.test(v) && digits.length >= 8 && digits.length <= 12;
  }

  // Bot checks: a hidden honeypot field was filled in, or the form was
  // submitted faster than a person could type. Callers fake success for bots.
  function looksLikeBot(honeypot, loadedAt) {
    return Boolean((honeypot && honeypot.value) || Date.now() - loadedAt < MIN_FILL_MS);
  }

  // Errors are written with textContent, never innerHTML, so nothing typed into
  // a form can ever become HTML on the page (XSS-safe by design).
  function showError(box, message, withEmailLink) {
    box.textContent = message;
    if (withEmailLink) {
      var a = document.createElement('a');
      a.href = 'mailto:' + EMAIL;
      a.textContent = EMAIL;
      box.appendChild(document.createTextNode(' Or email '));
      box.appendChild(a);
      box.appendChild(document.createTextNode('.'));
    }
    box.style.display = 'block';
  }

  function hideError(box, fields) {
    box.style.display = 'none';
    box.textContent = '';
    (fields || []).forEach(function (n) { if (n) n.removeAttribute('aria-invalid'); });
  }

  // Mark a field as the problem, move the cursor to it and explain why.
  function flag(box, node, message) {
    if (node) { node.setAttribute('aria-invalid', 'true'); node.focus(); }
    showError(box, message);
  }

  // Send to FormSubmit. Resolves on success; rejects with an Error whose
  // `userMessage` is safe to show the visitor (the real cause goes to console).
  function send(payload) {
    if (navigator.onLine === false) {
      var off = new Error('offline');
      off.userMessage = 'You seem to be offline. Check your connection and try again.';
      return Promise.reject(off);
    }
    payload._honey = '';           // FormSubmit's own spam field; must stay empty
    if (payload._subject) payload._subject = String(payload._subject).slice(0, 150);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) {
        // A 4xx/5xx often comes back as an HTML page; don't parse it as JSON.
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (!(d && (d.success === true || d.success === 'true'))) {
          throw new Error((d && d.message) || 'FormSubmit rejected the submission');
        }
      })
      .catch(function (err) {
        if (window.console) console.error('Form submission failed:', err);
        err.userMessage = err && err.name === 'AbortError'
          ? 'That took too long to send. Please try again.'
          : 'Sorry, that didn’t send. Please try again.';
        throw err;
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  // Swap the form for its confirmation and announce it to screen readers.
  function showSuccess(form, success) {
    form.style.display = 'none';
    success.style.display = 'block';
    success.setAttribute('tabindex', '-1');
    success.focus();
    try { success.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (ignored) { /* old browsers without smooth scrolling */ }
  }

  window.NxtForms = {
    line: line, text: text,
    validEmail: validEmail, validPhone: validPhone,
    looksLikeBot: looksLikeBot,
    showError: showError, hideError: hideError, flag: flag,
    send: send, showSuccess: showSuccess
  };
})();
