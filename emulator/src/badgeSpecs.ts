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
      x: 148,
      y: 48,
      width: 106,
      height: 82,
    },
    controls: [
      // D-pad (left ear) — center at (80, 90), spacing 13
      { key: 'up',    label: '\u2191', shape: 'circle', x: 80,  y: 77,  visualSize: 18, touchSize: 30 },
      { key: 'down',  label: '\u2193', shape: 'circle', x: 80,  y: 103, visualSize: 18, touchSize: 30 },
      { key: 'left',  label: '\u2190', shape: 'circle', x: 67,  y: 90,  visualSize: 18, touchSize: 30 },
      { key: 'right', label: '\u2192', shape: 'circle', x: 93,  y: 90,  visualSize: 18, touchSize: 30 },
      // Action buttons (right ear) — center at (320, 90), spacing 13
      { key: 'x', label: 'X', shape: 'circle', x: 320, y: 77,  visualSize: 18, touchSize: 30 },
      { key: 'y', label: 'Y', shape: 'circle', x: 333, y: 90,  visualSize: 18, touchSize: 30 },
      { key: 'a', label: 'A', shape: 'circle', x: 307, y: 90,  visualSize: 18, touchSize: 30 },
      { key: 'b', label: 'B', shape: 'circle', x: 320, y: 103, visualSize: 18, touchSize: 30 },
      // Menu / Start (center, below speaker)
      { key: 'menu',  label: 'MENU',  shape: 'pill', x: 184, y: 186, visualSize: 20, touchSize: 34 },
      { key: 'start', label: 'START', shape: 'pill', x: 217, y: 186, visualSize: 20, touchSize: 34 },
    ],
  },
};
