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

  // 3. Pause, mute, and reset ALL HTML5 Audio elements anywhere in the DOM
  try {
    if (typeof document !== 'undefined') {
      const allAudios = document.querySelectorAll('audio');
      allAudios.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      });
    }
  } catch {}

  // 4. Pause and reset globally registered audio players
  try {
    if (window.__activeSetecAudioPlayer) {
      try {
        window.__activeSetecAudioPlayer.pause();
        window.__activeSetecAudioPlayer.currentTime = 0;
      } catch {}
      window.__activeSetecAudioPlayer = null;
    }
  } catch {}

  // 5. Pause and reset Note audio if tracked
  try {
    if (window.__activeSetecNoteAudio) {
      try {
        window.__activeSetecNoteAudio.pause();
        window.__activeSetecNoteAudio.currentTime = 0;
      } catch {}
      window.__activeSetecNoteAudio = null;
    }
  } catch {}

  // 6. Clear any scheduled auto-play timers
  try {
    if (window.__activeSetecAudioTimer) {
      clearTimeout(window.__activeSetecAudioTimer);
      window.__activeSetecAudioTimer = null;
    }
  } catch {}

  // 7. Dispatch global stop event so active React state indicators sync to paused/stopped
  try {
    window.dispatchEvent(new CustomEvent('setec-stop-all-audio'));
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

export function registerGlobalNoteAudio(audio) {
  if (typeof window === 'undefined') return;
  window.__activeSetecNoteAudio = audio;
}

export function registerGlobalAudioTimer(timer) {
  if (typeof window === 'undefined') return;
  window.__activeSetecAudioTimer = timer;
}
