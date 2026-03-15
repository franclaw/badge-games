import './style.css';

type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  menu: boolean;
  start: boolean;
};

type EmulatorAPI = {
  width: number;
  height: number;
  clear: () => void;
  print: (line: string) => void;
  setHeader: (text: string) => void;
  setFooter: (text: string) => void;
};

type Game = {
  id: string;
  name: string;
  init: (api: EmulatorAPI) => void;
  tick: (dtMs: number, input: InputState, api: EmulatorAPI) => void;
};

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
  <h1 class="text-2xl md:text-3xl font-bold">🎮 Badge Games Emulator</h1>
  <p class="text-slate-300">Fri3d-like badge shell with simulated controls, display, and game loading.</p>

  <div class="grid gap-4 lg:grid-cols-3">
    <section class="card lg:col-span-2">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-slate-300">Status: <span id="emu-status" class="text-cyan-300">idle</span></div>
        <div class="flex flex-wrap gap-2 items-center">
          <select id="game-picker" class="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm"></select>
          <button id="btn-load" class="btn">Load game</button>
          <button id="btn-reset" class="btn">Reset</button>
        </div>
      </div>

      <div class="badge-shell badge-real">
        <div class="badge-topline">
          <span>FRI3D 2024</span>
          <span>EMULATOR</span>
        </div>

        <div class="badge-display">
          <div id="display-header" class="badge-header">No game loaded</div>
          <pre id="display" class="badge-screen">Booting...</pre>
          <div id="display-footer" class="badge-footer">240x320 text display simulation</div>
        </div>

        <div class="badge-controls">
          <div class="badge-left">
            <div class="dpad">
              <span></span><button data-key="up">↑</button><span></span>
              <button data-key="left">←</button><span class="pad text-center">•</span><button data-key="right">→</button>
              <span></span><button data-key="down">↓</button><span></span>
            </div>
          </div>

          <div class="badge-middle">
            <button data-key="menu" class="pad small">MENU</button>
            <button data-key="start" class="pad small">START</button>
          </div>

          <div class="badge-right face-grid">
            <button data-key="x" class="pad">X</button>
            <button data-key="y" class="pad">Y</button>
            <button data-key="a" class="pad">A</button>
            <button data-key="b" class="pad">B</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card space-y-3">
      <h2 class="text-xl font-semibold">Load / Motion</h2>

      <button id="btn-motion" class="btn w-full">Enable phone tilt controls</button>
      <p id="motion-status" class="text-xs text-slate-400">Motion: inactive (keyboard + on-screen still work)</p>

      <label class="text-sm">Game module URL</label>
      <input id="module-url" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm" placeholder="https://example.com/my-badge-game.js" />
      <button id="btn-load-url" class="btn w-full">Load module URL</button>

      <label class="text-sm">Manifest (.json)</label>
      <input id="manifest-file" type="file" accept="application/json" class="block w-full text-sm" />
      <p class="text-xs text-slate-400">Manifest format: {"name":"My Game","moduleUrl":"https://..."}</p>

      <div class="border-t border-slate-700 pt-2 text-xs text-slate-400">
        MicroPython .py isn’t executed directly in browser yet. For now, use adapter JS modules.
      </div>
    </section>
  </div>
</div>`;

const displayEl = document.getElementById('display')!;
const statusEl = document.getElementById('emu-status')!;
const motionStatusEl = document.getElementById('motion-status')!;
const headerEl = document.getElementById('display-header')!;
const footerEl = document.getElementById('display-footer')!;
const pickerEl = document.getElementById('game-picker') as HTMLSelectElement;

const api: EmulatorAPI = {
  width: DISPLAY_W,
  height: DISPLAY_H,
  clear: () => {
    displayLines.length = 0;
  },
  print: (line: string) => {
    displayLines.push(line.slice(0, DISPLAY_W));
    while (displayLines.length > DISPLAY_H) displayLines.shift();
  },
  setHeader: (t: string) => (headerEl.textContent = t),
  setFooter: (t: string) => (footerEl.textContent = t),
};

function flushDisplay() {
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

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
  const k = btn.dataset.key as keyof InputState;
  const on = () => (manual[k] = true);
  const off = () => (manual[k] = false);
  btn.addEventListener('mousedown', on);
  btn.addEventListener('mouseup', off);
  btn.addEventListener('mouseleave', off);
  btn.addEventListener('touchstart', on, { passive: true });
  btn.addEventListener('touchend', off, { passive: true });
});

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

async function loadModuleFromUrl(url: string) {
  const mod = await import(/* @vite-ignore */ url);
  const game: Game = mod.createGame?.();
  if (!game || !game.id || !game.name || !game.init || !game.tick) {
    throw new Error('Module must export createGame() returning a valid game');
  }
  registry.set(game.id, game);
  refreshPicker();
  pickerEl.value = game.id;
  loadGame(game.id);
}

(document.getElementById('btn-load-url') as HTMLButtonElement).addEventListener('click', async () => {
  const inputEl = document.getElementById('module-url') as HTMLInputElement;
  const url = inputEl.value.trim();
  if (!url) return;
  try {
    statusEl.textContent = 'loading module...';
    await loadModuleFromUrl(url);
  } catch (e) {
    statusEl.textContent = `module load failed: ${(e as Error).message}`;
  }
});

(document.getElementById('manifest-file') as HTMLInputElement).addEventListener('change', async (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const manifest = JSON.parse(await file.text()) as { name: string; moduleUrl: string };
    await loadModuleFromUrl(manifest.moduleUrl);
    statusEl.textContent = `manifest loaded: ${manifest.name}`;
  } catch (e) {
    statusEl.textContent = `manifest error: ${(e as Error).message}`;
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

refreshPicker();
loadGame('tilt-maze');
requestAnimationFrame(loop);
