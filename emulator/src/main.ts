import './style.css';
import { badgeSpecs, type BadgeSpec } from './badgeSpecs';
import { createPythonGame, PY_TEMPLATE } from './pythonRuntime';
import type { InputState, EmulatorAPI, Game, PixelOpsFrame } from './types';

// ─── Display state ──────────────────────────────────────────
const DISPLAY_W = 28;
const DISPLAY_H = 18;
const displayLines: string[] = [];
let activePixelFrame: PixelOpsFrame | null = null;
let activeBadgeSpec: BadgeSpec = JSON.parse(JSON.stringify(badgeSpecs.fri3d_2024));

// ─── Input state ────────────────────────────────────────────
const manual: InputState = {
  up: false, down: false, left: false, right: false,
  a: false, b: false, x: false, y: false,
  menu: false, start: false,
};

const motionState = { enabled: false, beta: 0, gamma: 0 };

// ─── View state ─────────────────────────────────────────────
type View = 'library' | 'play';
let currentView: View = 'library';
let currentGame: Game | null = null;
let last = performance.now();
let devPanelOpen = false;

// ─── Game registry ──────────────────────────────────────────
const registry = new Map<string, Game>();

const pyGames: Record<string, { name: string; path: string; description: string }> = {
  tilt_maze_shared: {
    name: 'Tilt Maze (Python)',
    path: 'pygames/tilt_maze_game.py',
    description: 'Navigate mazes using tilt or arrow keys. Shared MicroPython logic.',
  },
  pixel_bounce: {
    name: 'Pixel Bounce',
    path: 'pygames/pixel_bounce.py',
    description: 'Pixel-mode canvas demo with bouncing elements.',
  },
};

// ─── HTML shell ─────────────────────────────────────────────
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="view-library" class="view">
  <div class="library-container">
    <header class="library-header">
      <h1 class="library-title">Badge Games</h1>
      <p class="library-subtitle">Fri3d Badge 2024 MicroPython Simulator</p>
    </header>
    <div id="game-grid" class="game-grid"></div>
  </div>
</div>

<div id="view-play" class="view hidden">
  <div class="play-container">
    <nav class="play-nav">
      <button id="btn-back" class="nav-btn" aria-label="Back to library">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Games</span>
      </button>
      <span id="now-playing" class="now-playing"></span>
      <div class="nav-actions">
        <button id="btn-reset" class="nav-btn-sm">Reset</button>
        <button id="btn-dev" class="nav-btn-sm">Dev</button>
      </div>
    </nav>

    <div class="play-layout">
      <div class="emulator-column">
        <div id="badge-stage" class="badge-photo-stage">
          <img id="badge-photo" class="badge-photo" src="" alt="Badge" />
          <div id="screen-overlay" class="screen-overlay">
            <pre id="display" class="badge-screen"></pre>
            <canvas id="display-canvas" class="badge-canvas hidden"></canvas>
          </div>
          <div id="hotspots-layer"></div>
        </div>

        <div class="controls-hint">
          <kbd>Arrows</kbd> move &nbsp; <kbd>Z</kbd> A &nbsp; <kbd>X</kbd> B &nbsp; <kbd>A</kbd> X &nbsp; <kbd>S</kbd> Y &nbsp; <kbd>M</kbd> menu &nbsp; <kbd>Enter</kbd> start
        </div>

        <button id="btn-motion" class="motion-btn">Enable tilt controls</button>
        <p id="motion-status" class="motion-status">Keyboard + on-screen buttons active</p>
      </div>

      <div id="dev-panel" class="dev-panel hidden">
        <div class="dev-panel-header">
          <h3>Developer Tools</h3>
          <button id="btn-close-dev" class="nav-btn-sm">Close</button>
        </div>

        <div class="dev-section">
          <label class="dev-label">MicroPython Source</label>
          <select id="pygame-select" class="dev-select"></select>
          <div class="dev-btn-row">
            <button id="btn-run-editor" class="dev-btn dev-btn-primary">Run</button>
          </div>
          <textarea id="py-editor" class="dev-editor" spellcheck="false"></textarea>
          <p class="dev-hint">Define <code>init()</code> and <code>update(dt_ms, input_state)</code></p>
        </div>

        <details class="dev-section">
          <summary class="dev-label cursor-pointer">Badge Calibrator</summary>
          <div class="calibrator-grid">
            <label>sx<input id="cal-sx" type="number" class="cal-input" /></label>
            <label>sy<input id="cal-sy" type="number" class="cal-input" /></label>
            <label>sw<input id="cal-sw" type="number" class="cal-input" /></label>
            <label>sh<input id="cal-sh" type="number" class="cal-input" /></label>
          </div>
          <div class="calibrator-grid mt-1">
            <select id="cal-key" class="cal-input col-span-2"></select>
            <label>cx<input id="cal-cx" type="number" class="cal-input" /></label>
            <label>cy<input id="cal-cy" type="number" class="cal-input" /></label>
            <label>ts<input id="cal-ts" type="number" class="cal-input" /></label>
          </div>
          <button id="btn-export-spec" class="dev-btn mt-2 w-full">Export spec JSON</button>
          <textarea id="cal-output" class="cal-output"></textarea>
        </details>
      </div>
    </div>
  </div>
</div>
`;

// ─── Element refs ───────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;
const viewLibrary = $('view-library');
const viewPlay = $('view-play');
const gameGrid = $('game-grid');
const displayEl = $('display') as HTMLPreElement;
const canvasEl = $('display-canvas') as HTMLCanvasElement;
const nowPlayingEl = $('now-playing');
const badgePhotoEl = $('badge-photo') as HTMLImageElement;
const screenOverlayEl = $('screen-overlay') as HTMLDivElement;
const hotspotsLayerEl = $('hotspots-layer') as HTMLDivElement;
const motionStatusEl = $('motion-status');
const pySelectEl = $('pygame-select') as HTMLSelectElement;
const pyEditorEl = $('py-editor') as HTMLTextAreaElement;
const devPanelEl = $('dev-panel');
const calOutEl = $('cal-output') as HTMLTextAreaElement;
const calKeyEl = $('cal-key') as HTMLSelectElement;
const calSxEl = $('cal-sx') as HTMLInputElement;
const calSyEl = $('cal-sy') as HTMLInputElement;
const calSwEl = $('cal-sw') as HTMLInputElement;
const calShEl = $('cal-sh') as HTMLInputElement;
const calCxEl = $('cal-cx') as HTMLInputElement;
const calCyEl = $('cal-cy') as HTMLInputElement;
const calTsEl = $('cal-ts') as HTMLInputElement;

// ─── View switching ─────────────────────────────────────────
function showView(view: View) {
  currentView = view;
  viewLibrary.classList.toggle('hidden', view !== 'library');
  viewPlay.classList.toggle('hidden', view !== 'play');
}

// ─── Game cards ─────────────────────────────────────────────
type GameCardInfo = {
  id: string;
  name: string;
  description: string;
  tag: string;
};

function getGameCards(): GameCardInfo[] {
  const cards: GameCardInfo[] = [];

  for (const g of registry.values()) {
    if (g.id === 'python-live') continue;
    let desc = '';
    let tag = 'Built-in';
    if (g.id === 'tilt-maze') {
      desc = 'Navigate mazes by tilting the badge or using arrow keys. 3 levels with best-time tracking.';
      tag = 'JavaScript';
    } else if (g.id === 'reaction-arena') {
      desc = 'Test your reaction speed. Coming soon.';
      tag = 'Placeholder';
    } else if (g.id === 'pixel-studio') {
      desc = 'Creative pixel drawing tool. Coming soon.';
      tag = 'Placeholder';
    }
    cards.push({ id: g.id, name: g.name, description: desc, tag });
  }

  for (const [id, meta] of Object.entries(pyGames)) {
    cards.push({ id: `py:${id}`, name: meta.name, description: meta.description, tag: 'Python' });
  }

  return cards;
}

function renderGameGrid() {
  const cards = getGameCards();
  gameGrid.innerHTML = cards
    .map(
      (c) => `
    <button class="game-card" data-game-id="${c.id}">
      <div class="game-card-tag">${c.tag}</div>
      <h3 class="game-card-title">${c.name}</h3>
      <p class="game-card-desc">${c.description}</p>
      <span class="game-card-play">Play</span>
    </button>`,
    )
    .join('');

  gameGrid.querySelectorAll<HTMLButtonElement>('.game-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.gameId!;
      launchGame(id);
    });
  });
}

async function launchGame(id: string) {
  if (id.startsWith('py:')) {
    const pyId = id.slice(3);
    try {
      const source = await loadPyGameSourceById(pyId);
      const game = createPythonGame(source);
      registry.set(game.id, game);
      currentGame = game;
      nowPlayingEl.textContent = pyGames[pyId]?.name || 'Python Game';
    } catch (e) {
      alert(`Failed to load Python game: ${(e as Error).message}`);
      return;
    }
  } else {
    const game = registry.get(id);
    if (!game) return;
    currentGame = game;
    nowPlayingEl.textContent = game.name;
  }

  showView('play');
  currentGame.init(api);
  flushDisplay();
}

// ─── Emulator API ───────────────────────────────────────────
const api: EmulatorAPI = {
  width: DISPLAY_W,
  height: DISPLAY_H,
  clear: () => {
    displayLines.length = 0;
    activePixelFrame = null;
  },
  print: (line: string) => {
    displayLines.push(line.slice(0, DISPLAY_W));
    while (displayLines.length > DISPLAY_H) displayLines.shift();
  },
  setHeader: () => {},
  setFooter: () => {},
  setPixelFrame: (frame) => {
    activePixelFrame = frame;
  },
};

// ─── Display rendering ─────────────────────────────────────
function showTextScreen() {
  displayEl.classList.remove('hidden');
  canvasEl.classList.add('hidden');
}

function showCanvasScreen() {
  canvasEl.classList.remove('hidden');
  displayEl.classList.add('hidden');
}

function renderPixelFrame(frame: PixelOpsFrame) {
  const maxW = Math.max(80, Math.floor(screenOverlayEl.clientWidth));
  const maxH = Math.max(48, Math.floor(screenOverlayEl.clientHeight));
  const fitScale = Math.max(1, Math.floor(Math.min(maxW / frame.width, maxH / frame.height)));

  canvasEl.width = frame.width;
  canvasEl.height = frame.height;
  canvasEl.style.width = `${Math.floor(frame.width * fitScale)}px`;
  canvasEl.style.height = `${Math.floor(frame.height * fitScale)}px`;

  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  for (const op of frame.ops) {
    if (op[0] === 'fill') {
      ctx.fillStyle = op[1];
      ctx.fillRect(0, 0, frame.width, frame.height);
    } else if (op[0] === 'rect') {
      const [, x, y, w, h, color] = op;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
  }
}

function flushDisplay() {
  if (activePixelFrame) {
    showCanvasScreen();
    renderPixelFrame(activePixelFrame);
    return;
  }

  showTextScreen();
  const padded = [...displayLines];
  while (padded.length < DISPLAY_H) padded.push('');
  displayEl.textContent = padded.map((l) => l.padEnd(DISPLAY_W, ' ')).join('\n');
}

// ─── Input ──────────────────────────────────────────────────
const keyMap: Record<string, keyof InputState> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  z: 'a', x: 'b', a: 'x', s: 'y', m: 'menu', Enter: 'start',
};

document.addEventListener('keydown', (e) => {
  const k = keyMap[e.key];
  if (k) { manual[k] = true; e.preventDefault(); }
  if (e.key === 'Escape' && currentView === 'play') {
    showView('library');
  }
});

document.addEventListener('keyup', (e) => {
  const k = keyMap[e.key];
  if (k) manual[k] = false;
});

function bindHotspotInputs() {
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
    const k = btn.dataset.key as keyof InputState;
    const on = () => { manual[k] = true; btn.classList.add('pressed'); };
    const off = () => { manual[k] = false; btn.classList.remove('pressed'); };
    btn.onmousedown = on;
    btn.onmouseup = off;
    btn.onmouseleave = off;
    btn.ontouchstart = (e) => { e.preventDefault(); on(); };
    btn.ontouchend = (e) => { e.preventDefault(); off(); };
  });
}

function motionToInput(): Partial<InputState> {
  if (!motionState.enabled) return {};
  const t = 12;
  return {
    up: motionState.beta < -t,
    down: motionState.beta > t,
    left: motionState.gamma < -t,
    right: motionState.gamma > t,
  };
}

function combinedInput(): InputState {
  const m = motionToInput();
  return {
    up: manual.up || !!m.up, down: manual.down || !!m.down,
    left: manual.left || !!m.left, right: manual.right || !!m.right,
    a: manual.a, b: manual.b, x: manual.x, y: manual.y,
    menu: manual.menu, start: manual.start,
  };
}

async function enableMotion() {
  try {
    const anyWindow = window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    };
    const req = anyWindow.DeviceOrientationEvent?.requestPermission;
    if (req) {
      const result = await req();
      if (result !== 'granted') {
        motionStatusEl.textContent = 'Motion permission denied.';
        return;
      }
    }
    window.addEventListener('deviceorientation', (ev) => {
      motionState.beta = ev.beta ?? 0;
      motionState.gamma = ev.gamma ?? 0;
    });
    motionState.enabled = true;
    motionStatusEl.textContent = 'Tilt active. Move phone to control.';
  } catch (e) {
    motionStatusEl.textContent = `Motion failed: ${(e as Error).message}`;
  }
}

// ─── Badge spec ─────────────────────────────────────────────
function applyBadgeSpec(spec: BadgeSpec) {
  badgePhotoEl.src = spec.imageUrl;
  badgePhotoEl.alt = spec.name;
  const pxToPctX = (x: number) => (x / spec.baseWidth) * 100;
  const pxToPctY = (y: number) => (y / spec.baseHeight) * 100;

  screenOverlayEl.style.left = `${pxToPctX(spec.screen.x)}%`;
  screenOverlayEl.style.top = `${pxToPctY(spec.screen.y)}%`;
  screenOverlayEl.style.width = `${pxToPctX(spec.screen.width)}%`;
  screenOverlayEl.style.height = `${pxToPctY(spec.screen.height)}%`;

  hotspotsLayerEl.innerHTML = spec.controls
    .map((c) => {
      const touch = c.touchSize ?? c.visualSize;
      const vis = c.visualSize;
      return `<button aria-label="${c.label}" title="${c.label}" data-key="${c.key}" class="hotspot-touch ${c.shape}" style="left:${pxToPctX(c.x)}%; top:${pxToPctY(c.y)}%; width:${pxToPctX(vis)}%; height:${pxToPctY(vis)}%; --touch-w:${pxToPctX(touch)}%; --touch-h:${pxToPctY(touch)}%;"></button>`;
    })
    .join('');

  bindHotspotInputs();
}

// ─── Calibrator ─────────────────────────────────────────────
function refreshCalibratorUi() {
  calSxEl.value = String(Math.round(activeBadgeSpec.screen.x));
  calSyEl.value = String(Math.round(activeBadgeSpec.screen.y));
  calSwEl.value = String(Math.round(activeBadgeSpec.screen.width));
  calShEl.value = String(Math.round(activeBadgeSpec.screen.height));

  if (!calKeyEl.options.length) {
    activeBadgeSpec.controls.forEach((c) => {
      const o = document.createElement('option');
      o.value = c.key;
      o.textContent = c.key;
      calKeyEl.appendChild(o);
    });
  }

  const selected = activeBadgeSpec.controls.find((c) => c.key === calKeyEl.value) ?? activeBadgeSpec.controls[0];
  if (selected) {
    calKeyEl.value = selected.key;
    calCxEl.value = String(Math.round(selected.x));
    calCyEl.value = String(Math.round(selected.y));
    calTsEl.value = String(Math.round(selected.touchSize ?? selected.visualSize));
  }
}

function applyCalibratorValues() {
  activeBadgeSpec.screen.x = Number(calSxEl.value) || activeBadgeSpec.screen.x;
  activeBadgeSpec.screen.y = Number(calSyEl.value) || activeBadgeSpec.screen.y;
  activeBadgeSpec.screen.width = Number(calSwEl.value) || activeBadgeSpec.screen.width;
  activeBadgeSpec.screen.height = Number(calShEl.value) || activeBadgeSpec.screen.height;

  const selected = activeBadgeSpec.controls.find((c) => c.key === calKeyEl.value);
  if (selected) {
    selected.x = Number(calCxEl.value) || selected.x;
    selected.y = Number(calCyEl.value) || selected.y;
    selected.touchSize = Number(calTsEl.value) || selected.touchSize;
  }

  applyBadgeSpec(activeBadgeSpec);
}

function bindCalibrator() {
  [calSxEl, calSyEl, calSwEl, calShEl, calCxEl, calCyEl, calTsEl].forEach((el) => {
    el.addEventListener('input', applyCalibratorValues);
  });
  calKeyEl.addEventListener('change', refreshCalibratorUi);
  ($('btn-export-spec') as HTMLButtonElement).addEventListener('click', () => {
    calOutEl.value = JSON.stringify(activeBadgeSpec, null, 2);
  });
}

// ─── Python loading ─────────────────────────────────────────
async function loadPyGameSourceById(id: string) {
  if (id === 'python_template') return PY_TEMPLATE;
  const meta = pyGames[id];
  if (!meta) throw new Error(`Unknown game: ${id}`);
  const url = `${import.meta.env.BASE_URL}${meta.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function refreshPyGameSelect() {
  pySelectEl.innerHTML = '';
  Object.entries(pyGames).forEach(([id, meta]) => {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = meta.name;
    pySelectEl.appendChild(o);
  });
  const tplOpt = document.createElement('option');
  tplOpt.value = 'python_template';
  tplOpt.textContent = 'Blank template';
  pySelectEl.appendChild(tplOpt);
}

// ─── Event bindings ─────────────────────────────────────────
$('btn-back').addEventListener('click', () => showView('library'));

$('btn-reset').addEventListener('click', () => {
  if (currentGame) {
    currentGame.init(api);
    flushDisplay();
  }
});

$('btn-dev').addEventListener('click', () => {
  devPanelOpen = !devPanelOpen;
  devPanelEl.classList.toggle('hidden', !devPanelOpen);
  if (devPanelOpen) loadSelectedSource();
});

$('btn-close-dev').addEventListener('click', () => {
  devPanelOpen = false;
  devPanelEl.classList.add('hidden');
});

$('btn-motion').addEventListener('click', enableMotion);

async function loadSelectedSource() {
  try {
    const id = pySelectEl.value;
    const source = id === 'python_template' ? PY_TEMPLATE : await loadPyGameSourceById(id);
    pyEditorEl.value = source;
  } catch (e) {
    pyEditorEl.value = `# Load failed: ${(e as Error).message}`;
  }
}

pySelectEl.addEventListener('change', loadSelectedSource);

$('btn-run-editor').addEventListener('click', async () => {
  try {
    const source = pyEditorEl.value.trim() || PY_TEMPLATE;
    const game = createPythonGame(source);
    registry.set(game.id, game);
    currentGame = game;
    nowPlayingEl.textContent = 'Python Game (live)';
    game.init(api);
    flushDisplay();
  } catch (e) {
    alert(`Run failed: ${(e as Error).message}`);
  }
});

// ─── Built-in games ─────────────────────────────────────────
function makeTiltMazeGame(): Game {
  type Cell = '#' | '.' | 'S' | 'G';
  const levels = [
    { name: 'Level 1', grid: ['##########', '#S...#...#', '#.##.#.#.#', '#....#.#G#', '##########'] },
    { name: 'Level 2', grid: ['############', '#S...#.....#', '###.#.###..#', '#...#...##.#', '#.#####....#', '#......###G#', '############'] },
    { name: 'Level 3', grid: ['############', '#S....#....#', '#.##.##.##.#', '#..#....#..#', '##.####.#.##', '#....#..#G.#', '############'] },
  ];

  let level = 0;
  let ball = { x: 1, y: 1 };
  let t0 = performance.now();
  let stepCooldown = 0;
  const best: Record<string, number> = JSON.parse(localStorage.getItem('tilt-maze-best') || '{}');

  const find = (grid: string[], c: string) => {
    for (let y = 0; y < grid.length; y++) {
      const x = grid[y].indexOf(c);
      if (x >= 0) return { x, y };
    }
    return { x: 1, y: 1 };
  };

  const reset = () => { ball = find(levels[level].grid, 'S'); t0 = performance.now(); stepCooldown = 0; };

  const render = (a: EmulatorAPI) => {
    a.clear();
    const elapsed = (performance.now() - t0) / 1000;
    const key = `level_${level + 1}`;
    a.print(`  Tilt Maze - ${levels[level].name}`);
    a.print(`  Time: ${elapsed.toFixed(1)}s  Best: ${best[key] ? best[key].toFixed(1) + 's' : '--'}`);
    a.print('');

    for (let y = 0; y < levels[level].grid.length; y++) {
      let line = '  ';
      for (let x = 0; x < levels[level].grid[y].length; x++) {
        const c = levels[level].grid[y][x] as Cell;
        if (x === ball.x && y === ball.y) line += 'O';
        else if (c === 'S') line += '.';
        else line += c;
      }
      a.print(line);
    }
  };

  const tryMove = (dx: number, dy: number) => {
    const grid = levels[level].grid;
    const nx = ball.x + dx;
    const ny = ball.y + dy;
    if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) return;
    const cell = grid[ny][nx] as Cell;
    if (cell === '#') return;
    ball = { x: nx, y: ny };
    if (cell === 'G') {
      const t = (performance.now() - t0) / 1000;
      const k = `level_${level + 1}`;
      if (!best[k] || t < best[k]) {
        best[k] = t;
        localStorage.setItem('tilt-maze-best', JSON.stringify(best));
      }
      level = (level + 1) % levels.length;
      reset();
    }
  };

  return {
    id: 'tilt-maze',
    name: 'Tilt Maze',
    init(a) { reset(); render(a); },
    tick(dt, i, a) {
      stepCooldown -= dt;
      if (stepCooldown <= 0) {
        if (i.up || i.y) { tryMove(0, -1); stepCooldown = 120; }
        else if (i.down || i.a) { tryMove(0, 1); stepCooldown = 120; }
        else if (i.left || i.x) { tryMove(-1, 0); stepCooldown = 120; }
        else if (i.right || i.b) { tryMove(1, 0); stepCooldown = 120; }
      }
      render(a);
    },
  };
}

function makePlaceholder(id: string, name: string): Game {
  let t = 0;
  return {
    id,
    name,
    init(a) {
      a.clear();
      a.print(`  ${name}`);
      a.print('');
      a.print('  Coming soon...');
      a.print('  Use MENU/START to test input.');
    },
    tick(dt, i, a) {
      t += dt;
      if (t > 250) {
        t = 0;
        a.clear();
        a.print(`  ${name}`);
        a.print('');
        a.print(i.menu ? '  MENU pressed' : '');
        a.print(i.start ? '  START pressed' : '');
      }
    },
  };
}

// ─── Game loop ──────────────────────────────────────────────
function loop() {
  const now = performance.now();
  const dt = now - last;
  last = now;
  if (currentView === 'play' && currentGame) {
    currentGame.tick(dt, combinedInput(), api);
    flushDisplay();
  }
  requestAnimationFrame(loop);
}

// ─── Boot ───────────────────────────────────────────────────
registry.set('tilt-maze', makeTiltMazeGame());
registry.set('reaction-arena', makePlaceholder('reaction-arena', 'Reaction Arena'));
registry.set('pixel-studio', makePlaceholder('pixel-studio', 'Pixel Studio'));

applyBadgeSpec(activeBadgeSpec);
bindCalibrator();
refreshCalibratorUi();
refreshPyGameSelect();
renderGameGrid();
requestAnimationFrame(loop);
