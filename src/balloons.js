// Interactive floating balloons that appear during the balloons scene.
// They're DOM elements (easier to make clickable and accessible than canvas).

const BALLOON_PALETTE = [
  { fill: '#e9b73d', stroke: '#a8771a' },  // gold
  { fill: '#d4a857', stroke: '#7a4a14' },  // antique gold
  { fill: '#f3d27a', stroke: '#a8771a' },  // pale gold
  { fill: '#c89040', stroke: '#5a3010' },  // deep gold
];

const SURPRISE_MESSAGES = [
  '✨ MashaAllah ✨',
  '🌙 Barakallah',
  '🤲 Ameen',
  '⭐ Tabarakallah',
  '💛 For Talal',
  '🕌 Alhamdulillah',
];

export class Balloons {
  constructor(container, { onSpawnBurst } = {}) {
    this.container = container;
    this.onSpawnBurst = onSpawnBurst || (() => {});
    this.balloons = [];
    this._spawned = false;
  }

  spawnAll() {
    if (this._spawned) return;
    this._spawned = true;
    const count = 9;
    for (let i = 0; i < count; i++) {
      this._spawnBalloon(i, count);
    }
  }

  _spawnBalloon(i, total) {
    const wrap = document.createElement('div');
    wrap.className = 'balloon';
    const palette = BALLOON_PALETTE[i % BALLOON_PALETTE.length];

    // Position: spread across width, varying heights
    const xPct = 8 + (i / (total - 1)) * 84 + (Math.random() - 0.5) * 8;
    const yPct = 60 + Math.random() * 30;
    const delay = i * 0.18;
    const swayDur = 4 + Math.random() * 3;
    const riseDur = 7 + Math.random() * 4;

    wrap.style.left = `${xPct}%`;
    wrap.style.top = `${yPct}%`;
    wrap.style.animation = `balloon-sway ${swayDur}s ease-in-out ${delay}s infinite alternate`;

    wrap.innerHTML = `
      <div class="balloon-rise" style="animation: balloon-rise ${riseDur}s ease-out ${delay}s forwards;">
        <svg width="60" height="80" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bg${i}" cx="35%" cy="30%">
              <stop offset="0%" stop-color="#fff8dc" stop-opacity="0.85"/>
              <stop offset="60%" stop-color="${palette.fill}" stop-opacity="1"/>
              <stop offset="100%" stop-color="${palette.stroke}" stop-opacity="1"/>
            </radialGradient>
          </defs>
          <ellipse cx="30" cy="28" rx="22" ry="26" fill="url(#bg${i})" stroke="${palette.stroke}" stroke-width="0.8"/>
          <path d="M28 53 L32 53 L30 58 Z" fill="${palette.stroke}"/>
          <path d="M30 58 Q26 64 30 70 Q34 74 30 80" fill="none" stroke="${palette.stroke}" stroke-width="1" stroke-linecap="round"/>
        </svg>
      </div>
    `;

    wrap.dataset.idx = i;
    wrap.addEventListener('click', (e) => this._pop(wrap, e));
    wrap.addEventListener('touchstart', (e) => { e.preventDefault(); this._pop(wrap, e); });

    this.container.appendChild(wrap);
    this.balloons.push(wrap);
  }

  _pop(wrap, e) {
    if (wrap.classList.contains('popped')) return;
    wrap.classList.add('popped');
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    this.onSpawnBurst(cx, cy);

    // Show a tiny floating message
    const idx = parseInt(wrap.dataset.idx, 10) || 0;
    const msg = SURPRISE_MESSAGES[idx % SURPRISE_MESSAGES.length];
    const note = document.createElement('div');
    note.className = 'balloon-note';
    note.textContent = msg;
    note.style.left = wrap.style.left;
    note.style.top = wrap.style.top;
    this.container.appendChild(note);
    setTimeout(() => note.remove(), 2200);

    setTimeout(() => wrap.remove(), 500);
  }

  // Visibility driven by scroll
  setOpacity(o) {
    this.container.style.opacity = o;
    this.container.style.pointerEvents = o > 0.4 ? 'auto' : 'none';
  }

  clear() {
    this.balloons.forEach(b => b.remove());
    this.balloons = [];
    this._spawned = false;
  }
}
