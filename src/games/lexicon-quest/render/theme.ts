export const COLORS = {
  bgTop: 0x090d18,
  bgBottom: 0x111a2c,
  ink: 0x0b1120,
  panel: 0x121b2e,
  panelLight: 0x1a2740,
  panelSoft: 0x1f2c46,
  border: 0x33456a,
  borderSoft: 0x273554,
  gold: 0xe8ba6a,
  goldBright: 0xf7d795,
  goldDark: 0xa97a34,
  parchment: 0xf3e7cd,
  parchmentLight: 0xfbf3e1,
  parchmentDark: 0xd9c6a1,
  parchmentBorder: 0xb99d6c,
  inkText: 0x2a2117,
  inkSoft: 0x6d5c45,
  teal: 0x5fd0c8,
  tealDark: 0x2f8f8a,
  tealDim: 0x1d4e4c,
  red: 0xe36f6f,
  redDark: 0x8f3d45,
  green: 0x7fd39b,
  purple: 0xa394f2,
  text: 0xf6f0e3,
  muted: 0x94a3b8,
  mutedDark: 0x64748b,
  white: 0xffffff,
  black: 0x000000,
} as const;

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export const FONTS = {
  serif: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif",
  sans: "'Trebuchet MS', Verdana, Geneva, sans-serif",
  mono: "'Courier New', Courier, monospace",
} as const;

export const DEPTH = {
  backdrop: -20,
  sceneDecor: -10,
  stage: 0,
  tiles: 10,
  selection: 20,
  hud: 30,
  overlay: 100,
  tooltip: 120,
} as const;
