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
}
