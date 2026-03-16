import type { Game, InputState, PyGameFrame } from './types';

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

export const PY_TEMPLATE = `
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

export function createPythonGame(
  source: string,
  opts?: {
    onLog?: (line: string, level?: 'info' | 'error') => void;
  },
): Game {
  let py: any = null;
  let updateFn: any = null;

  const log = (line: string, level: 'info' | 'error' = 'info') => opts?.onLog?.(line, level);
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
    init(api) {
      api.clear();
      api.setHeader('Python runtime loading...');
      api.setFooter('Pyodide');
      api.print('Initializing Python VM...');
      log('Initializing Python VM...');

      ensurePyodide()
        .then((loaded) => {
          py = loaded;
          py.runPython(PY_BOOTSTRAP + '\n' + source);
          const rawUpdate = py.globals.get('update');
          if (!rawUpdate) throw new Error('Python script must define update(dt_ms, input_state)');
          updateFn = py.globals.get('_oc_call_update');

          const initFn = py.globals.get('init');
          if (initFn) initFn();

          api.clear();
          api.setHeader('Python game loaded');
          api.setFooter('Running same logic API as badge');
          api.print('Python VM ready.');
          log('Python VM ready.');
        })
        .catch((e: Error) => {
          api.clear();
          api.setHeader('Python load failed');
          api.setFooter('See error below');
          api.print(String(e.message || e));
          log(`Python load failed: ${String(e.message || e)}`, 'error');
        });
    },
    tick(dtMs: number, inputState: InputState, api) {
      if (!py || !updateFn) return;
      try {
        const frame = updateFn(dtMs, JSON.stringify(inputState));

        let out: PyGameFrame | undefined = pyToJs(frame);
        if (!out || typeof out !== 'object') {
          out = pyToJs(py.runPython('_oc_get_frame()')) as PyGameFrame;
        }

        if (out?.header) api.setHeader(out.header);
        if (out?.footer) api.setFooter(out.footer);

        if (out?.pixel) {
          api.clear();
          api.setPixelFrame(out.pixel);
        } else if (out?.lines) {
          api.setPixelFrame(null);
          api.clear();
          out.lines.forEach((l) => api.print(String(l)));
        }
      } catch (e) {
        api.clear();
        api.setHeader('Python runtime error');
        api.setFooter('Fix script and re-run');
        api.print(String(e));
        log(`Runtime error: ${String(e)}`, 'error');
      }
    },
  };
}
