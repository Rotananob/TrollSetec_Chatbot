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
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();
      const keyCode = e.keyCode || e.which;

      // Standalone F12
      if (key === 'f12' || code === 'f12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block inspect / dump shortcuts when combined with Ctrl / Cmd (Preserving normal typing!)
      if (isCtrlOrCmd) {
        // Ctrl/Cmd + Shift + [I, J, C, K] (DevTools, Console, Inspector)
        if (e.shiftKey && (['i', 'j', 'c', 'k'].includes(key) || ['keyi', 'keyj', 'keyc', 'keyk'].includes(code) || [73, 74, 67, 75].includes(keyCode))) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl/Cmd + [U, S, P] (View Source, Save Page, Print Dump)
        if (['u', 's', 'p'].includes(key) || ['keyu', 'keys', 'keyp'].includes(code) || [85, 83, 80].includes(keyCode)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Alt + Cmd/Ctrl + [I, J, C] (macOS Safari / Chrome inspect shortcuts)
        if (e.altKey && (['i', 'j', 'c'].includes(key) || ['keyi', 'keyj', 'keyc'].includes(code) || [73, 74, 67].includes(keyCode))) {
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
    console.debug = noop;
    console.info = noop;
  } catch {}
}
