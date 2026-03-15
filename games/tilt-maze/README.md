# Fri3d Tilt Maze (2024 badge)

Playable Tilt Maze MVP for Fri3d Badge 2024.

## Features

- 3 maze levels
- IMU tilt controls (WSEN-ISDS)
- Live timer
- Per-level best times saved to SD if available (`/sd/tilt_maze_scores.json`)
- Fallback score file in local FS (`tilt_maze_scores.json`) if SD is not mounted

## Files

- `app/main.py` - classic badge-specific implementation
- `app/main_shared.py` - runner shim for shared Python game contract
- `app/board_fri3d_2024.py`
- `shared/tilt_maze_game.py` - shared game logic (browser + badge)

## Install/run

### Classic runner

Copy files to badge and run:

```python
import main
main.run()
```

### Shared-code runner (same Python logic as browser)

Copy these 3 files to the same badge folder:

- `app/main_shared.py`
- `app/board_fri3d_2024.py`
- `shared/tilt_maze_game.py` (copied as `tilt_maze_game.py`)

Then run:

```python
import main_shared
main_shared.run()
```

## Controls

- Tilt left/right/up/down to move `O`
- Reach `G`
- `#` are walls

## Notes

- App renders in terminal/serial text mode for portability.
- Next step could be a full LVGL graphical version.
