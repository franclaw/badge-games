# MicroPython IDE Plan

Status: Draft v1

## Goal
Add a VSCode-like MicroPython IDE experience to `badge-games`, starting with emulator integration.

## Milestones

- M1: IDE shell + Monaco + local file editing
- M2: Run/stop + integrated console
- M3: MicroPython snippets + diagnostics
- M4: File sync adapter for emulator and real badge
- M5: UX polish + onboarding docs

## Definition of Done (v1)

A user can:
1. Open IDE view
2. Edit multiple `.py` files
3. Run code and inspect output
4. Save/reload workspace state
5. Sync to target adapter (emulator)

## Risks

- Browser limitations for direct device transport
- MicroPython-specific diagnostics may require custom stubs/tooling
- UX complexity if trying to match full VSCode too early

## Scope guardrails

- Build "VSCode-like", not full VSCode clone
- Emulator-first; hardware support can follow
- Keep each PR phase-sized and reviewable
