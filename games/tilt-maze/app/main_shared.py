"""
Badge runner shim for shared Python game logic.

Copy these files to badge together:
- app/main_shared.py
- shared/tilt_maze_game.py  (rename/copy to tilt_maze_game.py in same dir)
- app/board_fri3d_2024.py
"""

try:
    import utime as time
except Exception:
    import time

from board_fri3d_2024 import Fri3dBoard
import tilt_maze_game as game


def sleep_ms(ms):
    if hasattr(time, "sleep_ms"):
        time.sleep_ms(ms)
    else:
        time.sleep(ms / 1000)


def clear_screen():
    print("\x1b[2J\x1b[H", end="")


def accel_to_input(acc, threshold=120):
    out = {
        "up": False,
        "down": False,
        "left": False,
        "right": False,
        "a": False,
        "b": False,
        "x": False,
        "y": False,
        "menu": False,
        "start": False,
    }
    if not acc:
        return out

    x, y, _ = acc
    if y > threshold:
        out["down"] = True
    elif y < -threshold:
        out["up"] = True

    if x > threshold:
        out["right"] = True
    elif x < -threshold:
        out["left"] = True

    return out


def render(frame):
    clear_screen()
    print(frame.get("header", "Tilt Maze Shared"))
    print()
    for line in frame.get("lines", []):
        print(line)
    print()
    print(frame.get("footer", ""))


def run():
    board = Fri3dBoard()
    print("Shared runner boot")
    print("Board:", board.health())

    if hasattr(game, "init"):
        game.init()

    prev = time.ticks_ms() if hasattr(time, "ticks_ms") else int(time.time() * 1000)

    while True:
        now = time.ticks_ms() if hasattr(time, "ticks_ms") else int(time.time() * 1000)
        dt = time.ticks_diff(now, prev) if hasattr(time, "ticks_diff") else now - prev
        prev = now

        inputs = accel_to_input(board.read_accel_mg())
        frame = game.update(dt, inputs)
        render(frame)
        sleep_ms(100)


if __name__ == "__main__":
    run()
