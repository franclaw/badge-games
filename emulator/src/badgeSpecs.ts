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
  leftPct: number;
  topPct: number;
};

export type BadgeSpec = {
  id: string;
  name: string;
  imageUrl: string;
  screen: {
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
  };
  controls: BadgeControlSpec[];
};

export const badgeSpecs: Record<string, BadgeSpec> = {
  fri3d_2024: {
    id: 'fri3d_2024',
    name: 'Fri3d Badge 2024',
    imageUrl: 'https://raw.githubusercontent.com/Fri3dCamp/badge_2024/main/docs/badge2024.jpg',
    screen: {
      leftPct: 23.5,
      topPct: 21,
      widthPct: 53,
      heightPct: 43,
    },
    controls: [
      { key: 'up', label: '↑', shape: 'circle', leftPct: 27, topPct: 69 },
      { key: 'down', label: '↓', shape: 'circle', leftPct: 27, topPct: 86 },
      { key: 'left', label: '←', shape: 'circle', leftPct: 18, topPct: 78 },
      { key: 'right', label: '→', shape: 'circle', leftPct: 36, topPct: 78 },
      { key: 'x', label: 'X', shape: 'circle', leftPct: 73, topPct: 70 },
      { key: 'y', label: 'Y', shape: 'circle', leftPct: 82, topPct: 78 },
      { key: 'a', label: 'A', shape: 'circle', leftPct: 64, topPct: 78 },
      { key: 'b', label: 'B', shape: 'circle', leftPct: 73, topPct: 86 },
      { key: 'menu', label: 'MENU', shape: 'pill', leftPct: 47, topPct: 79 },
      { key: 'start', label: 'START', shape: 'pill', leftPct: 56, topPct: 79 },
    ],
  },
};
