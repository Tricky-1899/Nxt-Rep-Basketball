// Free assessment booking form (/assessment).
// Validation, spam checks and sending live in /assets/forms.js (shared with /contact).
(function () {
  'use strict';

  var F = window.NxtForms;
  var form = document.getElementById('assessForm');
  var errorBox = document.getElementById('formError');
  var btn = document.getElementById('submitBtn');
  var success = document.getElementById('successMsg');

  // Guard: if the shared helpers failed to load or the markup changed,
  // stop quietly rather than throwing and leaving a dead form.
  if (!F || !form || !errorBox || !btn || !success) return;

  var loadedAt = Date.now();
  var sending = false;
  var BTN_LABEL = btn.textContent;
  function el(id) { return document.getElementById(id); }

  // Required fields in on-screen order, so the cursor lands on the first problem.
  var FIELDS = [
    { id: 'parentName', label: 'your name' },
    { id: 'mobile', label: 'your mobile', check: F.validPhone, bad: 'Please check your mobile number.' },
    { id: 'email', label: 'your email', check: F.validEmail, bad: 'Please check your email address.' },
    { id: 'childName', label: "the player's first name" },
    { id: 'childAge', label: "the player's age" },
    { id: 'level', label: 'their current level' },
    { id: 'format', label: 'what you’re interested in' },
    { id: 'suburb', label: 'your suburb' }
  ];

  function setSending(on) {
    sending = on;
    btn.disabled = on;
    btn.textContent = on ? 'Booking…' : BTN_LABEL;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;   // ignore double-clicks / double Enter
    F.hideError(errorBox, FIELDS.map(function (f) { return el(f.id); }));

    // Bots get a fake success so they don't learn to adapt.
    if (F.looksLikeBot(el('website'), loadedAt)) { F.showSuccess(form, success); return; }

    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i], v = F.line(el(f.id));
      if (!v) { F.flag(errorBox, el(f.id), 'Please add ' + f.label + '. Only the notes box is optional.'); return; }
      if (f.check && !f.check(v)) { F.flag(errorBox, el(f.id), f.bad); return; }
    }

    var get = function (id) { return F.line(el(id)); };
    var consent = el('consent');
    setSending(true);
    F.send({
      'Parent name': get('parentName'),
      'Mobile': get('mobile'),
      'Email': get('email'),
      'Player': get('childName'),
      'Age': get('childAge'),
      'Level': get('level'),
      'Interested in': get('format'),
      'Suburb': get('suburb'),
      'Notes': F.text(el('goals')),
      'Marketing consent': consent && consent.checked ? 'YES - opted in to email/SMS updates' : 'No',
      _subject: 'Free assessment: ' + get('childName') + ' (' + get('childAge') + ', ' + get('suburb') + ')',
      _replyto: get('email'),
      _template: 'table'
    })
      .then(function () { F.showSuccess(form, success); })
      .catch(function (err) {
        F.showError(errorBox, err.userMessage, true);
        setSending(false);
      });
  });
})();
