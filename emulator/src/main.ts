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

const displayLines: string[] = [];
const DISPLAY_W = 28;
const DISPLAY_H = 18;

const input: InputState = {
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

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
  <h1 class="text-2xl md:text-3xl font-bold">🎮 Badge Games Emulator</h1>
  <p class="text-slate-300">Simulated Fri3d-style badge shell: display + controls + game loader.</p>

  <div class="grid gap-4 lg:grid-cols-3">
    <section class="card lg:col-span-2">
      <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div class="text-sm text-slate-300">Status: <span id="emu-status" class="text-cyan-300">idle</span></div>
        <div class="flex gap-2 items-center">
          <select id="game-picker" class="rounded-lg bg-slate-800 border border-slate-700 px-2 py-2 text-sm"></select>
          <button id="btn-load" class="btn">Load game</button>
          <button id="btn-reset" class="btn">Reset</button>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-700 bg-slate-950 p-4">
        <div class="mx-auto w-[320px] max-w-full rounded-3xl border-4 border-slate-600 bg-slate-900 p-4">
          <div class="mb-2 text-xs text-slate-400" id="display-header">No game loaded</div>
          <pre id="display" class="h-[360px] overflow-hidden rounded-xl bg-black text-green-300 p-3 text-[12px] leading-[1.2]">Booting...</pre>
          <div class="mt-2 text-xs text-slate-400" id="display-footer">240x320 simulated text framebuffer</div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <button data-key="up" class="pad">↑</button>
        <button data-key="down" class="pad">↓</button>
        <button data-key="left" class="pad">←</button>
        <button data-key="right" class="pad">→</button>
        <button data-key="a" class="pad">A</button>
        <button data-key="b" class="pad">B</button>
        <button data-key="x" class="pad">X</button>
        <button data-key="y" class="pad">Y</button>
        <button data-key="menu" class="pad">MENU</button>
        <button data-key="start" class="pad">START</button>
      </div>
    </section>

    <section class="card space-y-3">
      <h2 class="text-xl font-semibold">Load / Import</h2>
      <p class="text-sm text-slate-300">Built-ins are loaded from this emulator. You can also load a browser game module URL.</p>

      <label class="text-sm">Game module URL</label>
      <input id="module-url" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-2 text-sm" placeholder="https://example.com/my-badge-game.js" />
      <button id="btn-load-url" class="btn w-full">Load module URL</button>

      <label class="text-sm">Manifest (.json)</label>
      <input id="manifest-file" type="file" accept="application/json" class="block w-full text-sm" />
      <p class="text-xs text-slate-400">Manifest format: {"name":"My Game","moduleUrl":"https://..."}</p>

      <div class="pt-2 border-t border-slate-700">
        <h3 class="font-semibold">MicroPythonOS note</h3>
        <p class="text-xs text-slate-400">Raw .py games can’t run directly in this browser shell yet. Use a JS adapter module for now (same input/events model).</p>
      </div>
    </section>
  </div>
</div>`;

const style = document.createElement('style');
style.textContent = `.pad{border:1px solid #334155;background:#0f172a;border-radius:10px;padding:10px}.pad:active{background:#1e293b}`;
document.head.appendChild(style);

const displayEl = document.getElementById('display')!;
const statusEl = document.getElementById('emu-status')!;
const headerEl = document.getElementById('display-header')!;
const footerEl = document.getElementById('display-footer')!;
const pickerEl = document.getElementById('game-picker') as HTMLSelectElement;

const api: EmulatorAPI = {
  width: DISPLAY_W,
  height: DISPLAY_H,
  clear() {
    displayLines.length = 0;
  },
  print(line: string) {
    displayLines.push(line.slice(0, DISPLAY_W));
    while (displayLines.length > DISPLAY_H) displayLines.shift();
  },
  setHeader(text: string) {
    headerEl.textContent = text;
  },
  setFooter(text: string) {
    footerEl.textContent = text;
  },
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
  if (k) input[k] = true;
});
document.addEventListener('keyup', (e) => {
  const k = keyMap[e.key];
  if (k) input[k] = false;
});

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((btn) => {
  const k = btn.dataset.key as keyof InputState;
  btn.addEventListener('mousedown', () => (input[k] = true));
  btn.addEventListener('mouseup', () => (input[k] = false));
  btn.addEventListener('mouseleave', () => (input[k] = false));
  btn.addEventListener('touchstart', () => (input[k] = true));
  btn.addEventListener('touchend', () => (input[k] = false));
});

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
  const best: Record<string, number> = JSON.parse(localStorage.getItem('tilt-maze-best') || '{}');

  const find = (grid: string[], c: string) => {
    for (let y = 0; y < grid.length; y++) {
      const x = grid[y].indexOf(c);
      if (x >= 0) return { x, y };
    }
    return { x: 1, y: 1 };
  };

  const resetLevel = () => {
    ball = find(levels[level].grid, 'S');
    t0 = performance.now();
  };

  const render = (api2: EmulatorAPI) => {
    api2.clear();
    const elapsed = (performance.now() - t0) / 1000;
    const key = `level_${level + 1}`;
    api2.setHeader(`Tilt Maze • ${levels[level].name}`);
    api2.setFooter(`Time ${elapsed.toFixed(1)}s | Best ${best[key] ? best[key].toFixed(1) + 's' : '--'} | arrows/ABXY`);
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
    const g = levels[level].grid;
    const nx = ball.x + dx;
    const ny = ball.y + dy;
    if (ny < 0 || ny >= g.length || nx < 0 || nx >= g[0].length) return;
    const c = g[ny][nx] as Cell;
    if (c === '#') return;
    ball = { x: nx, y: ny };
    if (c === 'G') {
      const t = (performance.now() - t0) / 1000;
      const key = `level_${level + 1}`;
      if (!best[key] || t < best[key]) {
        best[key] = t;
        localStorage.setItem('tilt-maze-best', JSON.stringify(best));
      }
      level = (level + 1) % levels.length;
      resetLevel();
    }
  };

  return {
    id: 'tilt-maze',
    name: 'Tilt Maze',
    init(api2) {
      resetLevel();
      render(api2);
    },
    tick(_dt, i, api2) {
      if (i.up || i.y) tryMove(0, -1);
      else if (i.down || i.a) tryMove(0, 1);
      else if (i.left || i.x) tryMove(-1, 0);
      else if (i.right || i.b) tryMove(1, 0);
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
      api2.setHeader(`${name} (placeholder)`);
      api2.setFooter('Coming soon');
      api2.clear();
      api2.print('This game is scaffolded.');
      api2.print('Build is next.');
    },
    tick(dt, inputState, api2) {
      t += dt;
      if (t > 300) {
        t = 0;
        api2.clear();
        api2.print(`${name}`);
        api2.print('Waiting for implementation...');
        api2.print(inputState.menu ? 'MENU pressed' : 'Press MENU/M to test input');
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

(document.getElementById('btn-load') as HTMLButtonElement).addEventListener('click', () => {
  loadGame(pickerEl.value);
});

(document.getElementById('btn-reset') as HTMLButtonElement).addEventListener('click', () => {
  if (currentGame) {
    currentGame.init(api);
    flushDisplay();
  }
});

async function loadModuleFromUrl(url: string) {
  const mod = await import(/* @vite-ignore */ url);
  if (!mod?.createGame) throw new Error('Module must export createGame()');
  const game: Game = mod.createGame();
  if (!game.id || !game.name || !game.init || !game.tick) throw new Error('Invalid game interface');
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
    const text = await file.text();
    const manifest = JSON.parse(text) as { name: string; moduleUrl: string };
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
  currentGame?.tick(dt, input, api);
  flushDisplay();
  requestAnimationFrame(loop);
}

refreshPicker();
loadGame('tilt-maze');
requestAnimationFrame(loop);
