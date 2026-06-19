const AUDIO_STORAGE_KEY = "tiny-courier-audio";
const AUDIO_FILES = {
  bgm: "/audio/bgm.mp3",
  interact: "/audio/interact.mp3",
  pickup: "/audio/pickup.mp3",
  questComplete: "/audio/quest-complete.mp3",
  gameComplete: "/audio/game-complete.mp3",
  ui: "/audio/ui.mp3",
  walk: "/audio/walk.mp3",
};

export function createAudioManager() {
  const saved = readSavedSettings();
  const state = {
    muted: saved.muted,
    volume: saved.volume,
    unlocked: false,
    walkCooldown: 0,
  };

  const context = createAudioContext();
  const tracks = createTracks();

  function unlock() {
    if (state.unlocked) {
      return;
    }
    state.unlocked = true;
    if (context?.state === "suspended") {
      context.resume().catch(() => {});
    }
    startBgm();
  }

  function startBgm() {
    if (state.muted) {
      return;
    }

    const bgm = tracks.bgm;
    if (bgm && bgm.readyState > 0) {
      bgm.volume = state.volume * 0.36;
      bgm.loop = true;
      bgm.play().catch(() => {});
      return;
    }

    playTone({ frequency: 220, duration: 0.08, type: "sine", gain: 0.015 });
  }

  function stopBgm() {
    const bgm = tracks.bgm;
    if (bgm) {
      bgm.pause();
    }
  }

  function setMuted(nextMuted) {
    state.muted = nextMuted;
    saveSettings(state);
    applyVolume();
    if (state.muted) {
      stopBgm();
    } else {
      unlock();
      startBgm();
    }
  }

  function setVolume(nextVolume) {
    state.volume = clamp(nextVolume, 0, 1);
    saveSettings(state);
    applyVolume();
  }

  function play(name) {
    unlock();
    if (state.muted) {
      return;
    }

    const track = tracks[name];
    if (track && track.readyState > 0) {
      track.currentTime = 0;
      track.volume = getTrackVolume(name);
      track.play().catch(() => playFallback(name));
      return;
    }

    playFallback(name);
  }

  function tickWalk(isWalking, delta) {
    if (!isWalking || state.muted) {
      state.walkCooldown = 0;
      return;
    }

    state.walkCooldown -= delta;
    if (state.walkCooldown <= 0) {
      state.walkCooldown = 0.34;
      play("walk");
    }
  }

  function applyVolume() {
    Object.entries(tracks).forEach(([name, track]) => {
      track.volume = getTrackVolume(name);
    });
  }

  function getTrackVolume(name) {
    const multiplier = name === "bgm" ? 0.36 : name === "walk" ? 0.28 : 0.72;
    return state.muted ? 0 : state.volume * multiplier;
  }

  function createTracks() {
    const audioTracks = {};
    Object.entries(AUDIO_FILES).forEach(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = name === "bgm" ? "auto" : "metadata";
      audio.volume = getTrackVolume(name);
      audio.addEventListener("error", () => {
        audioTracks[name] = null;
      });
      audioTracks[name] = audio;
    });
    return audioTracks;
  }

  function playFallback(name) {
    const sound = {
      interact: { frequency: 440, duration: 0.06, type: "triangle", gain: 0.04 },
      pickup: { frequency: 660, duration: 0.09, type: "sine", gain: 0.045 },
      questComplete: { frequency: 880, duration: 0.16, type: "triangle", gain: 0.05 },
      gameComplete: { frequency: 523, duration: 0.24, type: "sine", gain: 0.055 },
      ui: { frequency: 330, duration: 0.05, type: "square", gain: 0.025 },
      walk: { frequency: 130, duration: 0.035, type: "sine", gain: 0.022 },
    }[name];

    if (sound) {
      playTone(sound);
    }
  }

  function playTone({ frequency, duration, type, gain }) {
    if (!context || state.muted) {
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(gain * state.volume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  return {
    get muted() {
      return state.muted;
    },
    get volume() {
      return state.volume;
    },
    unlock,
    play,
    tickWalk,
    setMuted,
    setVolume,
    startBgm,
    stopBgm,
  };
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function readSavedSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY));
    return {
      muted: Boolean(saved?.muted),
      volume: typeof saved?.volume === "number" ? clamp(saved.volume, 0, 1) : 0.65,
    };
  } catch {
    return {
      muted: false,
      volume: 0.65,
    };
  }
}

function saveSettings(state) {
  try {
    localStorage.setItem(
      AUDIO_STORAGE_KEY,
      JSON.stringify({
        muted: state.muted,
        volume: state.volume,
      }),
    );
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
