let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      // Web Audio API is unavailable.
    }
  }
  return audioCtx;
}

// Must be called from a user gesture because browsers block autoplay audio.
export async function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

// Play one short, non-looping alert for a new or ready ticket.
export function playOrderAlert(kind = 'new') {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return false;

    const now = ctx.currentTime;
    const primaryFrequency = kind === 'ready' ? 1046.5 : 880;
    const primaryEndFrequency = kind === 'ready' ? 1318.5 : 660;
    const secondaryFrequency = kind === 'ready' ? 1568 : 1320;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(primaryFrequency, now);
    osc1.frequency.exponentialRampToValueAtTime(primaryEndFrequency, now + 0.15);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(secondaryFrequency, now + 0.08);
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
    return true;
  } catch {
    return false;
  }
}

export const playNewOrderSound = () => playOrderAlert('new');
