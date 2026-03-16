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
    baseWidth: 420,
    baseHeight: 315,
    screen: {
      x: 99,
      y: 66,
      width: 223,
      height: 135,
    },
    controls: [
      { key: 'up', label: '↑', shape: 'circle', x: 113, y: 217, visualSize: 26, touchSize: 44 },
      { key: 'down', label: '↓', shape: 'circle', x: 113, y: 271, visualSize: 26, touchSize: 44 },
      { key: 'left', label: '←', shape: 'circle', x: 76, y: 246, visualSize: 26, touchSize: 44 },
      { key: 'right', label: '→', shape: 'circle', x: 151, y: 246, visualSize: 26, touchSize: 44 },
      { key: 'x', label: 'X', shape: 'circle', x: 307, y: 221, visualSize: 26, touchSize: 44 },
      { key: 'y', label: 'Y', shape: 'circle', x: 344, y: 246, visualSize: 26, touchSize: 44 },
      { key: 'a', label: 'A', shape: 'circle', x: 269, y: 246, visualSize: 26, touchSize: 44 },
      { key: 'b', label: 'B', shape: 'circle', x: 307, y: 271, visualSize: 26, touchSize: 44 },
      { key: 'menu', label: 'MENU', shape: 'pill', x: 197, y: 249, visualSize: 26, touchSize: 54 },
      { key: 'start', label: 'START', shape: 'pill', x: 235, y: 249, visualSize: 26, touchSize: 54 },
    ],
  },
};
