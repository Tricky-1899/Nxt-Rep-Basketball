// Shared site behaviour: mobile navigation menu.
// Loaded with `defer`, so the HTML is fully parsed before this runs.
// Kept in its own file (not inline) so a strict Content-Security-Policy can
// later drop 'unsafe-inline' for scripts, and so every page shares one copy.
(function () {
  'use strict';

  var toggle = document.getElementById('hamburger');
  var menu = document.getElementById('mobileNav');

  // Guard: if a page is missing either element, stop quietly instead of
  // throwing "Cannot read properties of null" and killing later scripts.
  if (!toggle || !menu) return;

  // Tell screen readers which element the button controls and its state.
  toggle.setAttribute('aria-controls', 'mobileNav');
  toggle.setAttribute('aria-expanded', 'false');

  function setOpen(open) {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', function () {
    setOpen(!menu.classList.contains('open'));
  });

  // Close after choosing a link (same-page #anchors would otherwise leave it open).
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Close with the Escape key and return focus to the button.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // If the screen is widened past the mobile breakpoint while the menu is
  // open (e.g. rotating a tablet), close it so it doesn't linger on desktop.
  var desktop = window.matchMedia('(min-width: 769px)');
  var onChange = function (mq) { if (mq.matches) setOpen(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onChange);
  else if (desktop.addListener) desktop.addListener(onChange); // older Safari
})();
