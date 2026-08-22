const heard = new Set<string>();
let ctx: AudioContext | null = null;
let unlocked = false;

function audioCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockNoteSound() {
  const audio = audioCtx();
  if (!audio) return;
  void audio.resume();
  unlocked = true;
}

export function armNoteSoundUnlock() {
  const arm = () => unlockNoteSound();
  document.addEventListener('pointerdown', arm);
  document.addEventListener('keydown', arm);
  return () => {
    document.removeEventListener('pointerdown', arm);
    document.removeEventListener('keydown', arm);
  };
}

export function noteHeard(id: string) {
  return heard.has(id);
}

export function rememberNote(id: string) {
  if (!id || heard.has(id)) return false;
  heard.add(id);
  if (heard.size > 250) {
    const first = heard.values().next().value;
    if (first) heard.delete(first);
  }
  return true;
}

/** Short two-tone chime. No loop. Silent if autoplay is still blocked. */
export function playNoteSound(id: string) {
  if (!rememberNote(id)) return;
  try {
    const audio = audioCtx();
    if (!audio) return;
    if (audio.state === 'suspended') {
      if (!unlocked) return;
      void audio.resume();
    }
    const now = audio.currentTime;
    const ding = (start: number, freq: number, dur: number, peak: number) => {
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      gain.connect(audio.destination);
      const osc = audio.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + dur);
    };
    /* Separate envelopes so overlapping tones do not clip. */
    ding(now, 988, 0.16, 0.72);
    ding(now + 0.13, 1319, 0.24, 0.85);
  } catch {
    /* autoplay or missing AudioContext */
  }
}
