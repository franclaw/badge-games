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

export type EmulatorAPI = {
  width: number;
  height: number;
  clear: () => void;
  print: (line: string) => void;
  setHeader: (text: string) => void;
  setFooter: (text: string) => void;
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
};
