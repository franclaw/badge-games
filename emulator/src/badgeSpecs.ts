export type ControlKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'menu'
  | 'start';

export type BadgeControlSpec = {
  key: ControlKey;
  label: string;
  shape: 'circle' | 'pill';
  x: number;
  y: number;
  visualSize: number;
  touchSize?: number;
};

export type BadgeSpec = {
  id: string;
  name: string;
  imageUrl: string;
  baseWidth: number;
  baseHeight: number;
  screen: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  controls: BadgeControlSpec[];
};

export const badgeSpecs: Record<string, BadgeSpec> = {
  fri3d_2024: {
    id: 'fri3d_2024',
    name: 'Fri3d Badge 2024',
    imageUrl: 'https://raw.githubusercontent.com/Fri3dCamp/badge_2024/main/docs/badge2024.jpg',
    // Coordinates match the image's natural 400x300 pixel space
    baseWidth: 400,
    baseHeight: 300,
    screen: {
      x: 157,
      y: 55,
      width: 90,
      height: 68,
    },
    controls: [
      // D-pad (left ear) — center at (82, 113), spacing 11
      { key: 'up',    label: '\u2191', shape: 'circle', x: 82,  y: 102, visualSize: 18, touchSize: 30 },
      { key: 'down',  label: '\u2193', shape: 'circle', x: 82,  y: 124, visualSize: 18, touchSize: 30 },
      { key: 'left',  label: '\u2190', shape: 'circle', x: 71,  y: 113, visualSize: 18, touchSize: 30 },
      { key: 'right', label: '\u2192', shape: 'circle', x: 93,  y: 113, visualSize: 18, touchSize: 30 },
      // Action buttons (right ear) — center at (318, 110), spacing 12
      { key: 'x', label: 'X', shape: 'circle', x: 318, y: 98,  visualSize: 18, touchSize: 30 },
      { key: 'y', label: 'Y', shape: 'circle', x: 330, y: 110, visualSize: 18, touchSize: 30 },
      { key: 'a', label: 'A', shape: 'circle', x: 306, y: 110, visualSize: 18, touchSize: 30 },
      { key: 'b', label: 'B', shape: 'circle', x: 318, y: 122, visualSize: 18, touchSize: 30 },
      // Menu / Start (center, below speaker)
      { key: 'menu',  label: 'MENU',  shape: 'pill', x: 182, y: 186, visualSize: 20, touchSize: 34 },
      { key: 'start', label: 'START', shape: 'pill', x: 216, y: 186, visualSize: 20, touchSize: 34 },
    ],
  },
};
