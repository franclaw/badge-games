import './style.css';
import { badgeSpecs, type BadgeSpec } from './badgeSpecs';
import { createPythonGame, PY_TEMPLATE } from './pythonRuntime';
import type { InputState, EmulatorAPI, Game, PixelOpsFrame } from './types';

const DISPLAY_W = 28;
const DISPLAY_H = 18;
const displayLines: string[] = [];

const manual: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  a: false,
  b: false,
  x: false,
  y: false,
  menu: false,
  start: false,
};

const motionState = {
  enabled: false,
  beta: 0,
  gamma: 0,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
  <div>
    <h1 class="text-2xl md:text-3xl font-bold">🎮 Badge Games MicroPython Simulator</h1>
    <p class="text-slate-300">Unified flow: pick a MicroPython game, edit code inline, run instantly.</p>
  </div>

  <div id="emulator-view" class="grid gap-4 lg:grid-cols-3">
    <section class="card lg:col-span-2">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-slate-300">Status: <span id="emu-status" class="text-cyan-300">idle</span></div>
        <div class="flex flex-wrap gap-2 items-center">
          <select id="game-picker" class="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm"></select>
          <button id="btn-load" class="btn">Load game</button>
          <button id="btn-reset" class="btn">Reset</button>
        </div>
      </div>

      <div id="badge-stage" class="badge-photo-stage">
        <img id="badge-photo" class="badge-photo" src="" alt="Badge skin" />

        <div id="screen-overlay" class="screen-overlay">
          <div id="display-header" class="badge-header">No game loaded</div>
          <pre id="display" class="badge-screen">Booting...</pre>
          <canvas id="display-canvas" class="badge-screen hidden"></canvas>
          <div id="display-footer" class="badge-footer">240x320 text display simulation</div>
        </div>

        <div id="hotspots-layer"></div>
      </div>
    </section>

    <section class="card space-y-3">
      <h2 class="text-xl font-semibold">Game + Code</h2>

      <button id="btn-motion" class="btn w-full">Enable phone tilt controls</button>
      <p id="motion-status" class="text-xs text-slate-400">Motion: inactive (keyboard + on-screen still work)</p>

      <div class="space-y-2 border-t border-slate-700 pt-3">
        <label class="text-sm">MicroPython game</label>
        <select id="pygame-select" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm"></select>
        <div class="grid grid-cols-2 gap-2">
          <button id="btn-load-pygame" class="btn">Load into editor</button>
          <button id="btn-run-editor" class="btn">Run editor code</button>
        </div>
        <textarea id="py-editor" class="h-64 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-100" spellcheck="false"></textarea>
        <p class="text-xs text-slate-400">Contract: define <code>init()</code> and <code>update(dt_ms, input_state)</code>.</p>
      </div>
    </section>
  </div>
</div>`;

const displayEl = document.getElementById('display') as HTMLPreElement;
const canvasEl = document.getElementById('display-canvas') as HTMLCanvasElement;
const statusEl = document.getElementById('emu-status')!;
const motionStatusEl = document.getElementById('motion-status')!;
const headerEl = document.getElementById('display-header')!;
const footerEl = document.getElementById('display-footer')!;
const pickerEl = document.getElementById('game-picker') as HTMLSelectElement;
const badgePhotoEl = document.getElementById('badge-photo') as HTMLImageElement;
const screenOverlayEl = document.getElementById('screen-overlay') as HTMLDivElement;
const hotspotsLayerEl = document.getElementById('hotspots-layer') as HTMLDivElement;
const pySelectEl = document.getElementById('pygame-select') as HTMLSelectElement;
const pyEditorEl = document.getElementById('py-editor') as HTMLTextAreaElement;

let activePixelFrame: PixelOpsFrame | null = null;

function showTextScreen() {
  displayEl.classList.remove('hidden');
  canvasEl.classList.add('hidden');
}

function showCanvasScreen() {
  canvasEl.classList.remove('hidden');
  displayEl.classList.add('hidden');
}

function renderPixelFrame(frame: PixelOpsFrame) {
  const maxW = Math.max(120, Math.floor(screenOverlayEl.clientWidth - 16));
  const maxH = Math.max(80, Math.floor(screenOverlayEl.clientHeight * 0.74));
  const fitScale = Math.max(1, Math.floor(Math.min(maxW / frame.width, maxH / frame.height)));

  canvasEl.width = frame.width;
  canvasEl.height = frame.height;
  canvasEl.style.width = `${frame.width * fitScale}px`;
  canvasEl.style.height = `${frame.height * fitScale}px`;

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
  setHeader: (t: string) => (headerEl.textContent = t),
  setFooter: (t: string) => (footerEl.textContent = t),
  setPixelFrame: (frame) => {
    activePixelFrame = frame;
  },
};

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

const keyMap: Record<string, keyof InputState> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  z: 'a',
  x: 'b',
  a: 'x',
  s: 'y',
  m: 'menu',
  Enter: 'start',
};

document.addEventListener('keydown', (e) => {
  const k = keyMap[e.key];
  if (k) manual[k] = true;
});
document.addEventListener('keyup', (e) => {
  const k = keyMap[e.key];
  if (k) manual[k] = false;
});

function bindHotspotInputs() {
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
    const k = btn.dataset.key as keyof InputState;
    const on = () => (manual[k] = true);
    const off = () => (manual[k] = false);
    btn.onmousedown = on;
    btn.onmouseup = off;
    btn.onmouseleave = off;
    btn.ontouchstart = () => on();
    btn.ontouchend = () => off();
  });
}

function applyBadgeSpec(spec: BadgeSpec) {
  badgePhotoEl.src = spec.imageUrl;
  badgePhotoEl.alt = spec.name;

  screenOverlayEl.style.left = `${spec.screen.leftPct}%`;
  screenOverlayEl.style.top = `${spec.screen.topPct}%`;
  screenOverlayEl.style.width = `${spec.screen.widthPct}%`;
  screenOverlayEl.style.height = `${spec.screen.heightPct}%`;

  hotspotsLayerEl.innerHTML = spec.controls
    .map(
      (c) =>
        `<button data-key="${c.key}" class="hotspot ${c.shape}" style="left:${c.leftPct}%; top:${c.topPct}%;">${c.label}</button>`,
    )
    .join('');

  bindHotspotInputs();
}

function motionToInput(): Partial<InputState> {
  if (!motionState.enabled) return {};
  const t = 12; // degrees threshold
  const beta = motionState.beta; // front-back
  const gamma = motionState.gamma; // left-right
  return {
    up: beta < -t,
    down: beta > t,
    left: gamma < -t,
    right: gamma > t,
  };
}

function combinedInput(): InputState {
  const m = motionToInput();
  return {
    up: manual.up || !!m.up,
    down: manual.down || !!m.down,
    left: manual.left || !!m.left,
    right: manual.right || !!m.right,
    a: manual.a,
    b: manual.b,
    x: manual.x,
    y: manual.y,
    menu: manual.menu,
    start: manual.start,
  };
}

async function enableMotion() {
  try {
    const anyWindow = window as unknown as {
      DeviceOrientationEvent?: {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
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
    motionStatusEl.textContent = 'Motion active. Tilt phone to move in supported games.';
  } catch (e) {
    motionStatusEl.textContent = `Motion setup failed: ${(e as Error).message}`;
  }
}

(document.getElementById('btn-motion') as HTMLButtonElement).addEventListener('click', enableMotion);

// Python runtime moved to pythonRuntime.ts

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

  const reset = () => {
    ball = find(levels[level].grid, 'S');
    t0 = performance.now();
    stepCooldown = 0;
  };

  const render = (api2: EmulatorAPI) => {
    api2.clear();
    const elapsed = (performance.now() - t0) / 1000;
    const key = `level_${level + 1}`;
    api2.setHeader(`Tilt Maze • ${levels[level].name}`);
    api2.setFooter(`Time ${elapsed.toFixed(1)}s | Best ${best[key] ? best[key].toFixed(1) + 's' : '--'} | tilt/arrows`);

    for (let y = 0; y < levels[level].grid.length; y++) {
      let line = '';
      for (let x = 0; x < levels[level].grid[y].length; x++) {
        const c = levels[level].grid[y][x] as Cell;
        if (x === ball.x && y === ball.y) line += 'O';
        else if (c === 'S') line += '.';
        else line += c;
      }
      api2.print(line);
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
    init(api2) {
      reset();
      render(api2);
    },
    tick(dt, i, api2) {
      stepCooldown -= dt;
      if (stepCooldown <= 0) {
        if (i.up || i.y) {
          tryMove(0, -1);
          stepCooldown = 120;
        } else if (i.down || i.a) {
          tryMove(0, 1);
          stepCooldown = 120;
        } else if (i.left || i.x) {
          tryMove(-1, 0);
          stepCooldown = 120;
        } else if (i.right || i.b) {
          tryMove(1, 0);
          stepCooldown = 120;
        }
      }
      render(api2);
    },
  };
}

function makePlaceholder(id: string, name: string): Game {
  let t = 0;
  return {
    id,
    name,
    init(api2) {
      api2.clear();
      api2.setHeader(`${name} (placeholder)`);
      api2.setFooter('coming soon');
      api2.print(`${name}`);
      api2.print('Scaffold is ready.');
      api2.print('Use MENU/START to test input.');
    },
    tick(dt, i, api2) {
      t += dt;
      if (t > 250) {
        t = 0;
        api2.clear();
        api2.print(`${name}`);
        api2.print('Scaffold is ready.');
        api2.print(i.menu ? 'MENU pressed' : '');
        api2.print(i.start ? 'START pressed' : '');
      }
    },
  };
}

const registry = new Map<string, Game>();
registry.set('tilt-maze', makeTiltMazeGame());
registry.set('reaction-arena', makePlaceholder('reaction-arena', 'Reaction Arena'));
registry.set('pixel-studio', makePlaceholder('pixel-studio', 'Pixel Studio'));

function refreshPicker() {
  pickerEl.innerHTML = '';
  for (const g of registry.values()) {
    const o = document.createElement('option');
    o.value = g.id;
    o.textContent = g.name;
    pickerEl.appendChild(o);
  }
}

let currentGame: Game | null = null;
let last = performance.now();

function loadGame(id: string) {
  const g = registry.get(id);
  if (!g) return;
  currentGame = g;
  statusEl.textContent = `loaded: ${g.name}`;
  g.init(api);
  flushDisplay();
}

(document.getElementById('btn-load') as HTMLButtonElement).addEventListener('click', () => loadGame(pickerEl.value));
(document.getElementById('btn-reset') as HTMLButtonElement).addEventListener('click', () => currentGame?.init(api));

const pyGames: Record<string, { name: string; path: string }> = {
  tilt_maze_shared: { name: 'Tilt Maze (shared)', path: 'pygames/tilt_maze_game.py' },
  pixel_bounce: { name: 'Pixel Bounce (canvas)', path: 'pygames/pixel_bounce.py' },
  python_template: { name: 'Python template', path: '' },
};

function refreshPyGameSelect() {
  pySelectEl.innerHTML = '';
  Object.entries(pyGames).forEach(([id, meta]) => {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = meta.name;
    pySelectEl.appendChild(o);
  });
}

async function loadPyGameSourceById(id: string) {
  if (id === 'python_template') return PY_TEMPLATE;
  const meta = pyGames[id];
  if (!meta) throw new Error(`Unknown game: ${id}`);
  const url = `${import.meta.env.BASE_URL}${meta.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function runPythonSource(source: string, label: string) {
  const game = createPythonGame(source);
  registry.set(game.id, game);
  refreshPicker();
  pickerEl.value = game.id;
  loadGame(game.id);
  statusEl.textContent = label;
}

(document.getElementById('btn-load-pygame') as HTMLButtonElement).addEventListener('click', async () => {
  try {
    const id = pySelectEl.value;
    const source = await loadPyGameSourceById(id);
    pyEditorEl.value = source;
    statusEl.textContent = `loaded into editor: ${pyGames[id]?.name || id}`;
  } catch (e) {
    statusEl.textContent = `load failed: ${(e as Error).message}`;
  }
});

(document.getElementById('btn-run-editor') as HTMLButtonElement).addEventListener('click', async () => {
  try {
    const source = pyEditorEl.value.trim() ? pyEditorEl.value : PY_TEMPLATE;
    await runPythonSource(source, 'running editor MicroPython code');
  } catch (e) {
    statusEl.textContent = `run failed: ${(e as Error).message}`;
  }
});

function loop() {
  const now = performance.now();
  const dt = now - last;
  last = now;
  currentGame?.tick(dt, combinedInput(), api);
  flushDisplay();
  requestAnimationFrame(loop);
}

applyBadgeSpec(badgeSpecs.fri3d_2024);
refreshPicker();
refreshPyGameSelect();
pySelectEl.value = 'tilt_maze_shared';
loadPyGameSourceById('tilt_maze_shared').then((src) => (pyEditorEl.value = src)).catch(() => {
  pyEditorEl.value = PY_TEMPLATE;
});
loadGame('tilt-maze');
requestAnimationFrame(loop);
