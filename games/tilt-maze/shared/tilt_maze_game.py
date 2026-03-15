"""
Shared Tilt Maze game logic.

Contract:
- init() optional
- update(dt_ms, input_state) -> frame dict

This file is designed to run both:
1) In browser Pyodide runtime
2) On real badge via app/main_shared.py runner
"""

LEVELS = [
    {
        "name": "Level 1",
        "grid": [
            "##########",
            "#S...#...#",
            "#.##.#.#.#",
            "#....#.#G#",
            "##########",
        ],
    },
    {
        "name": "Level 2",
        "grid": [
            "############",
            "#S...#.....#",
            "###.#.###..#",
            "#...#...##.#",
            "#.#####....#",
            "#......###G#",
            "############",
        ],
    },
    {
        "name": "Level 3",
        "grid": [
            "############",
            "#S....#....#",
            "#.##.##.##.#",
            "#..#....#..#",
            "##.####.#.##",
            "#....#..#G.#",
            "############",
        ],
    },
]

state = {
    "level": 0,
    "ball": [1, 1],
    "goal": [8, 3],
    "elapsed_ms": 0,
    "step_cooldown_ms": 0,
}


def _find(grid, char):
    for y, row in enumerate(grid):
        x = row.find(char)
        if x >= 0:
            return [x, y]
    return [1, 1]


def _reset_level():
    level = LEVELS[state["level"]]
    state["ball"] = _find(level["grid"], "S")
    state["goal"] = _find(level["grid"], "G")
    state["elapsed_ms"] = 0
    state["step_cooldown_ms"] = 0


def init():
    _reset_level()


def _try_move(dx, dy):
    level = LEVELS[state["level"]]
    grid = level["grid"]

    x, y = state["ball"]
    nx, ny = x + dx, y + dy

    if ny < 0 or ny >= len(grid) or nx < 0 or nx >= len(grid[0]):
        return
    if grid[ny][nx] == "#":
        return

    state["ball"] = [nx, ny]

    if state["ball"] == state["goal"]:
        state["level"] = (state["level"] + 1) % len(LEVELS)
        _reset_level()


def _render_lines():
    level = LEVELS[state["level"]]
    grid = level["grid"]
    lines = []

    for y, row in enumerate(grid):
        out = []
        for x, c in enumerate(row):
            if [x, y] == state["ball"]:
                out.append("O")
            elif c == "S":
                out.append(".")
            else:
                out.append(c)
        lines.append("".join(out))

    return lines


def update(dt_ms, input_state):
    state["elapsed_ms"] += int(dt_ms)
    state["step_cooldown_ms"] -= int(dt_ms)

    if state["step_cooldown_ms"] <= 0:
        if input_state.get("up") or input_state.get("y"):
            _try_move(0, -1)
            state["step_cooldown_ms"] = 120
        elif input_state.get("down") or input_state.get("a"):
            _try_move(0, 1)
            state["step_cooldown_ms"] = 120
        elif input_state.get("left") or input_state.get("x"):
            _try_move(-1, 0)
            state["step_cooldown_ms"] = 120
        elif input_state.get("right") or input_state.get("b"):
            _try_move(1, 0)
            state["step_cooldown_ms"] = 120

    level_name = LEVELS[state["level"]]["name"]
    elapsed_s = state["elapsed_ms"] / 1000.0

    return {
        "header": "Tilt Maze Shared • {}".format(level_name),
        "footer": "Time {:.1f}s | shared Python logic".format(elapsed_s),
        "lines": _render_lines(),
    }
