declare global {
  interface Window {
    require?: any;
    monaco?: any;
  }
}

type IdeInitOptions = {
  onSaveStatus?: (text: string) => void;
  onRunRequest?: (payload: { fileName: string; source: string }) => Promise<void>;
};

const IDE_STORAGE_KEY = 'badge-games-ide-files-v1';
const DEFAULT_FILE = 'main.py';

const defaultIdeSource = `# badge-games IDE MVP\n\nstate = {"x": 2, "y": 2}\n\ndef init():\n    pass\n\ndef update(dt_ms, input_state):\n    if input_state.get("left"):\n        state["x"] = max(0, state["x"] - 1)\n    if input_state.get("right"):\n        state["x"] = min(25, state["x"] + 1)\n\n    if input_state.get("up"):\n        state["y"] = max(0, state["y"] - 1)\n    if input_state.get("down"):\n        state["y"] = min(10, state["y"] + 1)\n\n    lines = ["MicroPython IDE MVP", "Use arrows/tilt", ""]\n    for row in range(12):\n        line = ""\n        for col in range(26):\n            line += "@" if (col == state["x"] and row == state["y"]) else "."\n        lines.append(line)\n\n    return {\n        "header": "IDE → Emulator",\n        "footer": f"dt={int(dt_ms)}ms",\n        "lines": lines,\n    }\n`;

export function initIde(opts: IdeInitOptions) {
  const ideFileListEl = document.getElementById('ide-file-list') as HTMLDivElement;
  const ideNewFileEl = document.getElementById('ide-new-file') as HTMLInputElement;
  const ideCurrentFileEl = document.getElementById('ide-current-file') as HTMLSpanElement;
  const ideRunStateEl = document.getElementById('ide-run-state') as HTMLSpanElement;
  const ideConsoleEl = document.getElementById('ide-console') as HTMLPreElement;

  let ideFiles: Record<string, string> = {};
  let ideCurrentFile = DEFAULT_FILE;
  let ideEditor: any = null;

  const logLine = (line: string) => {
    const now = new Date().toISOString().slice(11, 19);
    ideConsoleEl.textContent += `[${now}] ${line}\n`;
    ideConsoleEl.scrollTop = ideConsoleEl.scrollHeight;
  };

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
    opts.onSaveStatus?.(`IDE saved: ${ideCurrentFile}`);
    logLine(`Saved ${ideCurrentFile}`);
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

  async function boot() {
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
    logLine('IDE ready.');
  }

  (document.getElementById('ide-create-file') as HTMLButtonElement).addEventListener('click', () => {
    const name = ideNewFileEl.value.trim();
    if (!name) return;
    if (!name.endsWith('.py')) {
      opts.onSaveStatus?.('IDE file must end with .py');
      logLine(`Rejected file name: ${name}`);
      return;
    }
    if (!(name in ideFiles)) ideFiles[name] = '# New MicroPython file\n';
    persistIdeFiles();
    ideNewFileEl.value = '';
    openIdeFile(name);
    logLine(`Opened ${name}`);
  });

  (document.getElementById('ide-save') as HTMLButtonElement).addEventListener('click', saveCurrentIdeFile);

  (document.getElementById('ide-run') as HTMLButtonElement).addEventListener('click', async () => {
    saveCurrentIdeFile();
    ideRunStateEl.textContent = 'running';
    logLine(`Run requested: ${ideCurrentFile}`);
    try {
      await opts.onRunRequest?.({ fileName: ideCurrentFile, source: ideFiles[ideCurrentFile] });
      ideRunStateEl.textContent = 'idle';
      logLine('Run dispatched to emulator.');
    } catch (e) {
      ideRunStateEl.textContent = 'error';
      logLine(`Run failed: ${String(e)}`);
    }
  });

  (document.getElementById('ide-clear-console') as HTMLButtonElement).addEventListener('click', () => {
    ideConsoleEl.textContent = '';
  });

  return {
    boot,
    log: (line: string) => logLine(line),
  };
}
