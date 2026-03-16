import './style.css';
import { badgeSpecs, type BadgeSpec } from './badgeSpecs';
import { initIde } from './ide';
import { createPythonGame, PY_TEMPLATE } from './pythonRuntime';
import type { InputState, EmulatorAPI, Game } from './types';

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
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold">🎮 Badge Games + MicroPython IDE</h1>
      <p class="text-slate-300">Fri3d-like badge shell with simulator + VSCode-like editing workflow.</p>
    </div>
    <div class="flex gap-2">
      <button id="view-emulator" class="btn">Emulator</button>
      <button id="view-ide" class="btn">IDE (MVP)</button>
    </div>
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
          <div id="display-footer" class="badge-footer">240x320 text display simulation</div>
        </div>

        <div id="hotspots-layer"></div>
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

      <div class="border-t border-slate-700 pt-3 space-y-2">
        <h3 class="text-sm font-semibold">Python runtime (Pyodide alpha)</h3>
        <input id="python-file" type="file" accept=".py,text/x-python" class="block w-full text-sm" />
        <button id="btn-run-python" class="btn w-full">Run Python game</button>
        <button id="btn-load-shared-tilt" class="btn w-full">Load shared Tilt Maze Python</button>
        <p class="text-xs text-slate-400">Runs real Python in-browser. For badge parity, use the same simple API: <code>init()</code> and <code>update(dt_ms, input_state)</code>.</p>
      </div>
    </section>
  </div>

  <div id="ide-view" class="hidden grid gap-4 lg:grid-cols-[240px_1fr]">
    <section class="card space-y-3">
      <h2 class="text-lg font-semibold">Files</h2>
      <div class="space-y-2">
        <input id="ide-new-file" class="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm" placeholder="main.py" />
        <button id="ide-create-file" class="btn w-full">Create file</button>
      </div>
      <div id="ide-file-list" class="space-y-1 text-sm"></div>
    </section>

    <section class="card space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-sm text-slate-300">Open file: <span id="ide-current-file" class="text-cyan-300">none</span></div>
        <div class="text-xs text-slate-400">Run state: <span id="ide-run-state" class="text-cyan-300">idle</span></div>
        <div class="flex gap-2">
          <button id="ide-save" class="btn">Save</button>
          <button id="ide-run" class="btn">Run in emulator</button>
        </div>
      </div>
      <div id="ide-editor" class="h-[50vh] w-full rounded-xl border border-slate-700"></div>
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold">Console</h3>
          <button id="ide-clear-console" class="btn">Clear</button>
        </div>
        <pre id="ide-console" class="h-40 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-green-300"></pre>
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
const badgePhotoEl = document.getElementById('badge-photo') as HTMLImageElement;
const screenOverlayEl = document.getElementById('screen-overlay') as HTMLDivElement;
const hotspotsLayerEl = document.getElementById('hotspots-layer') as HTMLDivElement;
const pythonFileEl = document.getElementById('python-file') as HTMLInputElement;
const emulatorViewEl = document.getElementById('emulator-view') as HTMLDivElement;
const ideViewEl = document.getElementById('ide-view') as HTMLDivElement;

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

const PY_BOOTSTRAP = `
import json
_last_frame = {"header": "Python runtime", "footer": "", "lines": ["Ready"]}

def _oc_set_frame(frame):
    global _last_frame
    _last_frame = frame

def _oc_get_frame():
    return _last_frame

def _oc_call_update(dt_ms, input_json):
    state = json.loads(input_json)
    return update(dt_ms, state)
`;

async function ensurePyodide() {
  const w = window as any;
  if (w.__pyodideReady) return w.__pyodideReady;

  w.__pyodideReady = (async () => {
    if (!w.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load pyodide.js'));
        document.head.appendChild(s);
      });
    }
    const py = await w.loadPyodide();
    py.runPython(PY_BOOTSTRAP);
    return py;
  })();

  return w.__pyodideReady;
}

function makePythonGame(source: string): Game {
  let py: any = null;
  let updateFn: any = null;

  const pyToJs = (v: any) => {
    try {
      if (v && typeof v.toJs === 'function') {
        const converted = v.toJs({ dict_converter: Object.fromEntries });
        if (typeof v.destroy === 'function') v.destroy();
        return converted;
      }
    } catch (_) {}
    return v;
  };

  return {
    id: 'python-live',
    name: 'Python Game (live)',
    init(api2) {
      api2.clear();
      api2.setHeader('Python runtime loading...');
      api2.setFooter('Pyodide');
      api2.print('Initializing Python VM...');

      ensurePyodide()
        .then((loaded) => {
          py = loaded;
          py.runPython(PY_BOOTSTRAP + '\n' + source);
          const rawUpdate = py.globals.get('update');
          if (!rawUpdate) throw new Error('Python script must define update(dt_ms, input_state)');
          updateFn = py.globals.get('_oc_call_update');

          const initFn = py.globals.get('init');
          if (initFn) initFn();

          api2.clear();
          api2.setHeader('Python game loaded');
          api2.setFooter('Running same logic API as badge');
          api2.print('Python VM ready.');
        })
        .catch((e: Error) => {
          api2.clear();
          api2.setHeader('Python load failed');
          api2.setFooter('See error below');
          api2.print(String(e.message || e));
        });
    },
    tick(dtMs, inputState, api2) {
      if (!py || !updateFn) return;
      try {
        const frame = updateFn(dtMs, JSON.stringify(inputState));

        let out: PyGameFrame | undefined = pyToJs(frame);
        if (!out || typeof out !== 'object') {
          out = pyToJs(py.runPython('_oc_get_frame()')) as PyGameFrame;
        }

        if (out?.header) api2.setHeader(out.header);
        if (out?.footer) api2.setFooter(out.footer);
        if (out?.lines) {
          api2.clear();
          out.lines.forEach((l) => api2.print(String(l)));
        }
      } catch (e) {
        api2.clear();
        api2.setHeader('Python runtime error');
        api2.setFooter('Fix script and re-run');
        api2.print(String(e));
      }
    },
  };
}

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

const PY_TEMPLATE = `
# Works in browser runtime and can be adapted on-badge with same API.
state = {"x": 2, "y": 2}

def init():
    pass

def update(dt_ms, input_state):
    if input_state.get("left"):
        state["x"] = max(1, state["x"] - 1)
    elif input_state.get("right"):
        state["x"] = min(24, state["x"] + 1)

    if input_state.get("up"):
        state["y"] = max(1, state["y"] - 1)
    elif input_state.get("down"):
        state["y"] = min(10, state["y"] + 1)

    lines = ["Python game running", "Use dpad/tilt", ""]
    for row in range(12):
        s = ""
        for col in range(26):
            s += "@" if (col == state["x"] and row == state["y"]) else "."
        lines.append(s)

    return {
      "header": "Python Game",
      "footer": f"dt={int(dt_ms)}ms",
      "lines": lines,
    }
`;

async function loadPythonSource(source: string, label: string) {
  const game = makePythonGame(source);
  registry.set(game.id, game);
  refreshPicker();
  pickerEl.value = game.id;
  loadGame(game.id);
  statusEl.textContent = label;
}

(document.getElementById('btn-run-python') as HTMLButtonElement).addEventListener('click', async () => {
  try {
    const file = pythonFileEl.files?.[0];
    const source = file ? await file.text() : PY_TEMPLATE;
    await loadPythonSource(source, file ? `python loaded: ${file.name}` : 'python template loaded');
  } catch (e) {
    statusEl.textContent = `python load failed: ${(e as Error).message}`;
  }
});

(document.getElementById('btn-load-shared-tilt') as HTMLButtonElement).addEventListener('click', async () => {
  try {
    const url = `${import.meta.env.BASE_URL}pygames/tilt_maze_game.py`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const source = await res.text();
    await loadPythonSource(source, 'shared tilt maze python loaded');
  } catch (e) {
    statusEl.textContent = `shared python load failed: ${(e as Error).message}`;
  }
});

const IDE_STORAGE_KEY = 'badge-games-ide-files-v1';
const DEFAULT_FILE = 'main.py';
const defaultIdeSource = `# badge-games IDE MVP\n\nstate = {"x": 2, "y": 2}\n\ndef init():\n    pass\n\ndef update(dt_ms, input_state):\n    if input_state.get("left"):\n        state["x"] = max(0, state["x"] - 1)\n    if input_state.get("right"):\n        state["x"] = min(25, state["x"] + 1)\n\n    if input_state.get("up"):\n        state["y"] = max(0, state["y"] - 1)\n    if input_state.get("down"):\n        state["y"] = min(10, state["y"] + 1)\n\n    lines = ["MicroPython IDE MVP", "Use arrows/tilt", ""]\n    for row in range(12):\n        line = ""\n        for col in range(26):\n            line += "@" if (col == state["x"] and row == state["y"]) else "."\n        lines.append(line)\n\n    return {\n        "header": "IDE → Emulator",\n        "footer": f"dt={int(dt_ms)}ms",\n        "lines": lines,\n    }\n`;

let ideFiles: Record<string, string> = {};
let ideCurrentFile = DEFAULT_FILE;
let ideEditor: any = null;

function loadIdeFiles() {
  try {
    const raw = localStorage.getItem(IDE_STORAGE_KEY);
    ideFiles = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    ideFiles = {};
  }
  if (!Object.keys(ideFiles).length) {
    ideFiles[DEFAULT_FILE] = defaultIdeSource;
  }
}

function persistIdeFiles() {
  localStorage.setItem(IDE_STORAGE_KEY, JSON.stringify(ideFiles));
}

function renderIdeFileList() {
  ideFileListEl.innerHTML = '';
  Object.keys(ideFiles)
    .sort()
    .forEach((name) => {
      const row = document.createElement('button');
      row.className = `w-full rounded-lg border px-2 py-1 text-left ${
        name === ideCurrentFile ? 'border-cyan-500 bg-slate-800 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-200'
      }`;
      row.textContent = name;
      row.addEventListener('click', () => openIdeFile(name));
      ideFileListEl.appendChild(row);
    });
}

function openIdeFile(name: string) {
  ideCurrentFile = name;
  ideCurrentFileEl.textContent = name;
  if (ideEditor) {
    ideEditor.setValue(ideFiles[name] ?? '');
  }
  renderIdeFileList();
}

function saveCurrentIdeFile() {
  if (!ideEditor || !ideCurrentFile) return;
  ideFiles[ideCurrentFile] = ideEditor.getValue();
  persistIdeFiles();
  renderIdeFileList();
  statusEl.textContent = `IDE saved: ${ideCurrentFile}`;
}

async function ensureMonacoEditor() {
  if (window.monaco) return;

  if (!window.require) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Monaco loader'));
      document.head.appendChild(s);
    });
  }

  await new Promise<void>((resolve) => {
    window.require.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
      },
    });
    window.require(['vs/editor/editor.main'], () => resolve());
  });
}

async function initIde() {
  loadIdeFiles();
  renderIdeFileList();

  await ensureMonacoEditor();

  if (!ideEditor) {
    ideEditor = window.monaco.editor.create(document.getElementById('ide-editor')!, {
      value: '',
      language: 'python',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
    });
  }

  openIdeFile(ideCurrentFile in ideFiles ? ideCurrentFile : Object.keys(ideFiles)[0]);
}

function showView(view: 'emulator' | 'ide') {
  const isIde = view === 'ide';
  ideViewEl.classList.toggle('hidden', !isIde);
  emulatorViewEl.classList.toggle('hidden', isIde);
  if (isIde) initIde();
}

(document.getElementById('view-emulator') as HTMLButtonElement).addEventListener('click', () => showView('emulator'));
(document.getElementById('view-ide') as HTMLButtonElement).addEventListener('click', () => showView('ide'));

(document.getElementById('ide-create-file') as HTMLButtonElement).addEventListener('click', () => {
  const name = ideNewFileEl.value.trim();
  if (!name) return;
  if (!name.endsWith('.py')) {
    statusEl.textContent = 'IDE file must end with .py';
    return;
  }
  if (!(name in ideFiles)) ideFiles[name] = '# New MicroPython file\n';
  persistIdeFiles();
  ideNewFileEl.value = '';
  openIdeFile(name);
});

(document.getElementById('ide-save') as HTMLButtonElement).addEventListener('click', saveCurrentIdeFile);

(document.getElementById('ide-run') as HTMLButtonElement).addEventListener('click', async () => {
  saveCurrentIdeFile();
  const source = ideFiles[ideCurrentFile];
  await loadPythonSource(source, `running from IDE: ${ideCurrentFile}`);
  showView('emulator');
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
loadGame('tilt-maze');
requestAnimationFrame(loop);
