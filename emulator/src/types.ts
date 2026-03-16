export type InputState = {
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

export type PixelOpsFrame = {
  width: number;
  height: number;
  ops: Array<["fill", string] | ["rect", number, number, number, number, string]>;
};

export type EmulatorAPI = {
  width: number;
  height: number;
  clear: () => void;
  print: (line: string) => void;
  setHeader: (text: string) => void;
  setFooter: (text: string) => void;
  setPixelFrame: (frame: PixelOpsFrame | null) => void;
};

export type Game = {
  id: string;
  name: string;
  init: (api: EmulatorAPI) => void;
  tick: (dtMs: number, input: InputState, api: EmulatorAPI) => void;
};

export type PyGameFrame = {
  header?: string;
  footer?: string;
  lines?: string[];
  pixel?: PixelOpsFrame;
};
