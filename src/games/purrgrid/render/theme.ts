export const COLORS = {
  bgTop: 0x10142a,
  bgBottom: 0x1d1733,
  bgDeep: 0x0b0e1e,
  panel: 0x1b2038,
  panelLight: 0x252b48,
  panelSoft: 0x2e3558,
  border: 0x3b4468,
  borderSoft: 0x2c3352,
  cream: 0xfff4dc,
  creamDark: 0xe8d9bb,
  gold: 0xf6c86a,
  goldBright: 0xffdf9c,
  goldDark: 0xa9813c,
  pink: 0xf28ba8,
  pinkDark: 0xa64c68,
  mint: 0x7fe0c3,
  mintDark: 0x3b8f7b,
  sky: 0x8ec8f6,
  lavender: 0xb7a6f7,
  text: 0xf7f1e6,
  muted: 0x9aa4c4,
  mutedDark: 0x6b7494,
  danger: 0xff7b86,
  dangerDark: 0xa83d4b,
  success: 0x86e0a3,
  shadow: 0x080a16,
  white: 0xffffff,
  black: 0x000000,
  cat: 0x2c2542,
  catDark: 0x1b172b,
  catEye: 0xfff2c8,
} as const;

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export const FONTS = {
  display: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif",
  sans: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif",
  mono: "'Courier New', Courier, monospace",
} as const;

export const DEPTH = {
  backdrop: -20,
  board: 0,
  grid: 10,
  regionBorder: 20,
  conflict: 30,
  cats: 40,
  hover: 50,
  hud: 80,
  toast: 90,
  overlay: 100,
  overlayPanel: 110,
} as const;
