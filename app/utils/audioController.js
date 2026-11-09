// app/utils/audioController.js
// Global Audio Coordinator to eliminate audio overlap and duplicate playback across pages & sessions

export function stopAllGlobalAudio() {
  if (typeof window === 'undefined') return;

  // 1. Cancel browser Web Speech API
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {}

  // 2. Stop Web Audio API active source node
  try {
    if (window.__activeSetecSourceNode) {
      window.__activeSetecSourceNode.onended = null;
      try {
        window.__activeSetecSourceNode.stop();
      } catch {}
      window.__activeSetecSourceNode = null;
    }
  } catch {}

  // 3. Pause and reset HTML5 Audio players
  try {
    if (window.__activeSetecAudioPlayer) {
      window.__activeSetecAudioPlayer.pause();
      window.__activeSetecAudioPlayer.currentTime = 0;
    }
  } catch {}

  // 4. Clear any scheduled auto-play timers
  try {
    if (window.__activeSetecAudioTimer) {
      clearTimeout(window.__activeSetecAudioTimer);
      window.__activeSetecAudioTimer = null;
    }
  } catch {}
}

export function registerGlobalAudioSource(source) {
  if (typeof window === 'undefined') return;
  window.__activeSetecSourceNode = source;
}

export function registerGlobalAudioPlayer(player) {
  if (typeof window === 'undefined') return;
  window.__activeSetecAudioPlayer = player;
}

export function registerGlobalAudioTimer(timer) {
  if (typeof window === 'undefined') return;
  window.__activeSetecAudioTimer = timer;
}
