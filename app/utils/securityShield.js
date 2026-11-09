// app/utils/securityShield.js
// Ultra Secret & Ultra Secure DevTools / Inspection Stealth Shield

let isShieldActive = false;

export function initSecurityShield() {
  if (typeof window === 'undefined' || isShieldActive) return;
  isShieldActive = true;

  // 1. Silent Right-Click (Context Menu) Block - ZERO Alerts
  const preventEvent = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    return false;
  };

  window.addEventListener('contextmenu', preventEvent, true);
  document.addEventListener('contextmenu', preventEvent, true);
  try {
    document.oncontextmenu = preventEvent;
  } catch {}

  // 2. Comprehensive Shortcut & Keydown Inspection Block - ZERO Alerts
  window.addEventListener(
    'keydown',
    (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();
      const keyCode = e.keyCode || e.which;

      // Standalone F12, ContextMenu key, Shift+F10
      if (
        key === 'f12' ||
        code === 'f12' ||
        keyCode === 123 ||
        key === 'contextmenu' ||
        code === 'contextmenu' ||
        (isShift && (key === 'f10' || code === 'f10' || keyCode === 121))
      ) {
        return preventEvent(e);
      }

      // Block inspect / dump shortcuts when combined with Ctrl / Cmd (Preserving normal typing!)
      if (isCtrlOrCmd) {
        // Ctrl/Cmd + Shift + [I, J, C, K, E, S, M] (DevTools, Console, Inspector, Network, etc.)
        if (
          isShift &&
          (['i', 'j', 'c', 'k', 'e', 's', 'm'].includes(key) ||
            ['keyi', 'keyj', 'keyc', 'keyk', 'keye', 'keys', 'keym'].includes(code) ||
            [73, 74, 67, 75, 69, 83, 77].includes(keyCode))
        ) {
          return preventEvent(e);
        }

        // Ctrl/Cmd + [U, S, P, H] (View Source, Save Page, Print Dump, History)
        if (
          ['u', 's', 'p', 'h'].includes(key) ||
          ['keyu', 'keys', 'keyp', 'keyh'].includes(code) ||
          [85, 83, 80, 72].includes(keyCode)
        ) {
          return preventEvent(e);
        }

        // Alt + Cmd/Ctrl + [I, J, C, U] (macOS Safari / Chrome inspect shortcuts)
        if (
          isAlt &&
          (['i', 'j', 'c', 'u'].includes(key) ||
            ['keyi', 'keyj', 'keyc', 'keyu'].includes(code) ||
            [73, 74, 67, 85].includes(keyCode))
        ) {
          return preventEvent(e);
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
        return preventEvent(e);
      }
    },
    { capture: true }
  );

  // 4. Console Neutralizer: Hide internal logs from Developer Console completely
  try {
    const noop = () => {};
    window.console.log = noop;
    window.console.info = noop;
    window.console.warn = noop;
    window.console.error = noop;
    window.console.debug = noop;
    window.console.dir = noop;
    window.console.table = noop;
    window.console.trace = noop;
    window.console.clear();
    setInterval(() => {
      try {
        window.console.clear();
      } catch {}
    }, 1500);
  } catch {}

  // 5. Silent Anti-Debugger Trap: Freezes DevTools on constructor evaluation
  try {
    let devtoolsHits = 0;
    setInterval(() => {
      try {
        const start = performance.now();
        (function () {}['constructor']('debugger')());
        const duration = performance.now() - start;
        if (duration > 150) {
          devtoolsHits++;
          if (devtoolsHits >= 2) {
            document.body.innerHTML = '';
            window.location.replace('about:blank');
          }
        } else {
          devtoolsHits = 0;
        }
      } catch {}
    }, 400);
  } catch {}
}
