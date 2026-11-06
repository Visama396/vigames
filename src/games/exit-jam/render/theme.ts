export const COLORS = {
  bgTop: 0x151225,
  bgBottom: 0x2a1730,
  bgDeep: 0x0c0916,
  panel: 0x231a35,
  panelLight: 0x2d2343,
  panelSoft: 0x3a2c55,
  border: 0x4a3a68,
  borderSoft: 0x35284a,
  cream: 0xfff2df,
  creamDark: 0xe4d3bd,
  gold: 0xf7c667,
  goldBright: 0xffe3a1,
  goldDark: 0xa97d39,
  text: 0xf9f1e7,
  muted: 0xa79bc0,
  mutedDark: 0x776c92,
  danger: 0xff7185,
  dangerDark: 0xa6394b,
  coral: 0xff6b7d,
  success: 0x7fe3ae,
  mint: 0x5ce0b8,
  mintDark: 0x1f8d6a,
  shadow: 0x07050e,
  white: 0xffffff,
  black: 0x000000,
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
  grid: 5,
  doors: 8,
  blocks: 20,
  selected: 30,
  hud: 80,
  toast: 90,
  overlay: 100,
  overlayPanel: 110,
} as const;
