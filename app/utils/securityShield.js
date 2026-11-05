// app/utils/securityShield.js
// Ultra Secret & Ultra Secure DevTools / Inspection Stealth Shield

let isShieldActive = false;

export function initSecurityShield() {
  if (typeof window === 'undefined' || isShieldActive) return;
  isShieldActive = true;

  // 1. Silent Right-Click (Context Menu) Block - NO Alerts
  window.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 2. Comprehensive Shortcut & Keydown Inspection Block - NO Alerts
  window.addEventListener(
    'keydown',
    (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const keyCode = e.keyCode || e.which;

      // Standalone F12
      if (key === 'f12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Only block inspect / dump shortcuts when combined with Ctrl / Cmd (Preserving normal typing!)
      if (isCtrlOrCmd) {
        // Ctrl/Cmd + Shift + [I, J, C, K] (DevTools, Console, Inspector)
        if (e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl/Cmd + [U, S, P] (View Source, Save Page, Print Dump)
        if (['u', 's', 'p'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Alt + Cmd/Ctrl + [I, J, C] (macOS Safari / Chrome inspect shortcuts)
        if (e.altKey && ['i', 'j', 'c'].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    },
    { capture: true }
  );

  // 3. Prevent dragging source assets or images
  window.addEventListener(
    'dragstart',
    (e) => {
      if (e.target?.tagName === 'IMG' || e.target?.tagName === 'A') {
        e.preventDefault();
      }
    },
    { capture: true }
  );

  // 4. Console Neutralizer: Hide internal logs from Developer Console in production
  try {
    const noop = () => {};
    const bannerArgs = [
      '%cSETEC Neural Core v3.8\n%cProprietary AI System by Rotana NOB. All rights reserved.',
      'font-size: 16px; font-weight: 900; color: #3b82f6;',
      'font-size: 11px; color: #94a3b8;'
    ];

    // Clear console periodically and show fake proprietary banner
    setInterval(() => {
      try {
        console.clear();
        console.log(...bannerArgs);
      } catch {}
    }, 2000);

    // Suppress console leaks
    console.debug = noop;
    console.info = noop;
  } catch {}

  // 5. Anti-Debugging timing detector (Silently detects DevTools open without intrusive alert)
  try {
    let checkCount = 0;
    setInterval(() => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        // Devtools debugger paused execution: clear console instantly
        try {
          console.clear();
        } catch {}
      }
      checkCount++;
    }, 1500);
  } catch {}
}
