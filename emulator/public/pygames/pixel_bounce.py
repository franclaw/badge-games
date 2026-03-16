# Pixel framebuffer demo for emulator.
# Uses return format:
# {
#   "header": str,
#   "footer": str,
#   "pixel": {
#      "width": int,
#      "height": int,
#      "ops": [
#         ["fill", "#000000"],
#         ["rect", x, y, w, h, "#00ff88"]
#      ]
#   }
# }

state = {
    "x": 10,
    "y": 8,
    "vx": 1,
    "vy": 1,
    "w": 96,
    "h": 64,
}


def init():
    pass


def update(dt_ms, input_state):
    # controls
    if input_state.get("left"):
        state["vx"] = -1
    elif input_state.get("right"):
        state["vx"] = 1
    if input_state.get("up"):
        state["vy"] = -1
    elif input_state.get("down"):
        state["vy"] = 1

    # move
    state["x"] += state["vx"]
    state["y"] += state["vy"]

    # bounce on bounds
    if state["x"] < 0:
        state["x"] = 0
        state["vx"] = 1
    if state["y"] < 0:
        state["y"] = 0
        state["vy"] = 1
    if state["x"] > state["w"] - 8:
        state["x"] = state["w"] - 8
        state["vx"] = -1
    if state["y"] > state["h"] - 8:
        state["y"] = state["h"] - 8
        state["vy"] = -1

    ops = [
        ["fill", "#05070a"],
        ["rect", 0, 0, state["w"], 1, "#103040"],
        ["rect", 0, state["h"] - 1, state["w"], 1, "#103040"],
        ["rect", 0, 0, 1, state["h"], "#103040"],
        ["rect", state["w"] - 1, 0, 1, state["h"], "#103040"],
        ["rect", state["x"], state["y"], 8, 8, "#00ff88"],
    ]

    return {
        "header": "Pixel Demo",
        "footer": "Use dpad/tilt to steer",
        "pixel": {
            "width": state["w"],
            "height": state["h"],
            "ops": ops,
        },
    }
