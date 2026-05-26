// Background nasheed loop + simple mute toggle UI wiring.
// Autoplay is blocked by browsers until user interaction — we start muted,
// then unmute on click of the toggle, or on the first scroll if a flag is set.

export class AudioController {
  constructor({ nasheedEl, toggleEl, iconMuted, iconUnmuted }) {
    this.nasheed = nasheedEl;
    this.toggle = toggleEl;
    this.iconMuted = iconMuted;
    this.iconUnmuted = iconUnmuted;

    this.isMuted = true;
    this.nasheed.volume = 0.45;

    this.toggle.addEventListener('click', () => this.toggleMute());

    // Try to start playing muted — most browsers allow muted autoplay
    this._tryPlayMuted();
  }

  async _tryPlayMuted() {
    try {
      this.nasheed.muted = true;
      await this.nasheed.play();
    } catch (e) {
      // Some browsers still block — that's fine, will start on first interaction
    }
  }

  async toggleMute() {
    this.isMuted = !this.isMuted;
    this.nasheed.muted = this.isMuted;
    if (!this.isMuted) {
      try { await this.nasheed.play(); } catch (e) { /* noop */ }
    }
    this._updateIcon();
  }

  _updateIcon() {
    if (this.isMuted) {
      this.iconMuted.style.display = '';
      this.iconUnmuted.style.display = 'none';
    } else {
      this.iconMuted.style.display = 'none';
      this.iconUnmuted.style.display = '';
    }
  }

  playCreak() {
    // Optional creak SFX — only plays if file exists
    try {
      const a = new Audio('assets/audio/creak.mp3');
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch (e) {}
  }

  // Pilot-style voice-over via the browser's speech synthesis engine
  speak(text, opts = {}) {
    if (!('speechSynthesis' in window)) return;
    try {
      // Cancel any queued utterance so callouts feel snappy
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate   = opts.rate   ?? 0.95;
      u.pitch  = opts.pitch  ?? 0.85;
      u.volume = opts.volume ?? 0.9;
      // Prefer a deeper male English voice when available
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        /en[-_]/i.test(v.lang) &&
        /Daniel|Alex|Fred|David|Aaron|Tom|Google US English|Microsoft Mark|Male/i.test(v.name)
      );
      if (preferred) u.voice = preferred;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // Synthesized "ding" — clean cockpit-confirmation chime via Web Audio API
  playDing() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = this._sfxCtx || (this._sfxCtx = new Ctx());
      // Resume if suspended (Safari/Chrome autoplay policies)
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Bell-like chord: fundamental + octave above + slight detune for warmth
      const freqs = [1318.5, 2637.0];   // E6 + E7 — bright cockpit chime
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.32, now + 0.01);   // quick attack
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);  // decay
      masterGain.connect(ctx.destination);

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        const partial = ctx.createGain();
        partial.gain.value = i === 0 ? 1 : 0.35;
        osc.connect(partial);
        partial.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.8);
      });
    } catch (e) {}
  }
}
