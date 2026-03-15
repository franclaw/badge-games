# AGENTS.md — badge-games

Purpose: give future sessions a stable starting point to implement a **MicroPython IDE experience inspired by VS Code** inside this repo.

## Project snapshot

- Repo: `franclaw/badge-games`
- Current focus: web emulator (`emulator/`) + MicroPython-targeted games (`games/*`)
- Goal extension: add an in-browser IDE workflow for writing/running MicroPython code against the badge/emulator.

## Objective

Build a "VSCode-like" MicroPython IDE in/for `badge-games` with:

1. Code editor UX (tabs, syntax highlighting, theme, shortcuts)
2. File/project explorer for badge files
3. Run/stop + serial/REPL console
4. Basic linting/intellisense (MicroPython-aware where possible)
5. Device sync (upload/download files)
6. Integration with emulator and eventually physical badge

---

## Implementation plan (phased)

## Phase 0 — Discovery & constraints (short)

- Confirm target runtime environments:
  - Browser-only for now?
  - Any local helper/bridge allowed later?
- Decide transport strategy:
  - Emulator API first
  - Physical badge via WebSerial/WebUSB as later phase
- Decide packaging in monorepo:
  - likely `emulator` hosts IDE app/shell

**Deliverable:** short architecture decision note in `docs/micropython-ide-adr.md`.

## Phase 1 — IDE shell MVP

- Add IDE route/view in `emulator` (split panes)
  - Left: file tree
  - Center: editor
  - Bottom/right: terminal/REPL
- Integrate Monaco Editor (VS Code core editor component)
- Support open/save files in in-memory workspace

**MVP done when:** can create/edit/save multiple `.py` files in browser state.

## Phase 2 — Run loop + console

- Add "Run" action to execute script in emulator context
- Stream stdout/stderr to console pane
- Add stop/reset controls
- Preserve console history per session

**MVP done when:** user edits code and sees execution output without page reload.

## Phase 3 — MicroPython ergonomics

- Add snippets for common badge APIs
- Add lightweight diagnostics (syntax + common mistakes)
- Add optional type hints/stubs for badge-specific modules
- Add command palette style actions (Run, Format, Upload, Download)

**MVP done when:** coding feels closer to a lightweight VSCode workflow.

## Phase 4 — Device/file sync

- Define device FS abstraction:
  - list/read/write/delete files
- Implement emulator adapter first
- Add pluggable adapter for real badge transport
- Add sync status + conflict handling

**MVP done when:** IDE can roundtrip files between editor and target FS.

## Phase 5 — polish + docs

- Keyboard shortcuts and layout persistence
- Error UX and reconnect behavior
- Documentation and screenshots/gif
- Optional: tutorial project template

**MVP done when:** first external user can follow README and succeed.

---

## Proposed technical direction

- **Editor:** Monaco
- **Frontend host:** existing `emulator` app
- **Execution transport:** adapter interface
  - `EmulatorAdapter`
  - `BadgeAdapter` (future)
- **State:** keep project files + UI layout in local storage initially
- **Language support:** Python syntax + MicroPython stubs/snippets

Suggested interface shape:

```ts
interface TargetAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listFiles(path?: string): Promise<FileEntry[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  run(pathOrCode: { path?: string; code?: string }): Promise<void>;
  stop(): Promise<void>;
  onConsole(cb: (line: string) => void): () => void;
}
```

---

## Session handoff checklist (for next agents)

At session start:

1. Read this file (`AGENTS.md`)
2. Inspect current emulator architecture and routing
3. Create/update task breakdown in PR description or issue
4. Implement **only one phase-sized chunk** per PR
5. Include screenshots/video for UI changes

Before ending session:

- Update this plan status (what changed)
- Add "Next 3 actions" bullets
- Commit with clear message

---

## Immediate next 3 actions

1. Create `docs/micropython-ide-adr.md` with final architecture choices.
2. Scaffold IDE route in `emulator` with split-pane layout.
3. Integrate Monaco with open/edit/save for in-memory files.

---

## Notes

- Keep scope tight: get a vertical slice working quickly.
- Prefer simple adapters over early abstraction-heavy design.
- Prioritize emulator-first usability before physical-device support.
