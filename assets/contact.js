// General contact form (/contact): schools, clubs, partnerships, general enquiries.
// Validation, spam checks and sending live in /assets/forms.js (shared with /assessment).
(function () {
  'use strict';

  var F = window.NxtForms;
  var form = document.getElementById('contactForm');
  var errorBox = document.getElementById('formError');
  var btn = document.getElementById('submitBtn');
  var success = document.getElementById('successMsg');
  var enquiry = document.getElementById('enquiryType');
  var nudge = document.getElementById('assessNudge');

  // Point private-training enquiries to the free assessment form instead.
  // Runs even if the form part below can't, so the nudge never breaks.
  if (enquiry && nudge) {
    var updateNudge = function () {
      nudge.style.display = enquiry.value === 'Private training session' ? 'block' : 'none';
    };
    enquiry.addEventListener('change', updateNudge);
    updateNudge();   // also right after a browser back/forward restores the field
  }

  // Guard: if the shared helpers failed to load or the markup changed,
  // stop quietly rather than throwing and leaving a dead form.
  if (!F || !form || !errorBox || !btn || !success) return;

  var loadedAt = Date.now();
  var sending = false;
  var BTN_LABEL = btn.textContent;
  function el(id) { return document.getElementById(id); }

  // Required fields in on-screen order. Last name and phone are optional.
  var FIELDS = [
    { id: 'firstName', label: 'your first name' },
    { id: 'email', label: 'your email', check: F.validEmail, bad: 'Please check your email address.' },
    { id: 'enquiryType', label: 'what you’re enquiring about' },
    { id: 'message', label: 'a message', multiline: true }
  ];

  function setSending(on) {
    sending = on;
    btn.disabled = on;
    btn.textContent = on ? 'Sending…' : BTN_LABEL;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;   // ignore double-clicks / double Enter
    F.hideError(errorBox, FIELDS.map(function (f) { return el(f.id); }).concat(el('phone')));

    // Bots get a fake success so they don't learn to adapt.
    if (F.looksLikeBot(el('website'), loadedAt)) { F.showSuccess(form, success); return; }

    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i], node = el(f.id);
      var v = f.multiline ? F.text(node) : F.line(node);
      if (!v) { F.flag(errorBox, node, 'Please add ' + f.label + '.'); return; }
      if (f.check && !f.check(v)) { F.flag(errorBox, node, f.bad); return; }
    }

    // Phone is optional, but if it's filled in it has to look like a number.
    var phone = F.line(el('phone'));
    if (phone && !F.validPhone(phone)) {
      F.flag(errorBox, el('phone'), 'Please check your phone number, or leave it blank.');
      return;
    }

    var first = F.line(el('firstName'));
    var last = F.line(el('lastName'));
    var topic = F.line(enquiry);
    setSending(true);
    F.send({
      name: last ? first + ' ' + last : first,   // no trailing space when last name is blank
      email: F.line(el('email')),
      phone: phone || 'Not given',
      enquiry: topic,
      message: F.text(el('message')),
      _subject: 'New website enquiry: ' + topic + ' (' + first + ')',
      _replyto: F.line(el('email')),
      _template: 'table'
    })
      .then(function () { F.showSuccess(form, success); })
      .catch(function (err) {
        F.showError(errorBox, err.userMessage, true);
        setSending(false);
      });
  });
})();
