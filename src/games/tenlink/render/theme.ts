export const COLORS = {
  bgTop: 0x08161f,
  bgBottom: 0x0f2b37,
  bgDeep: 0x050d13,
  panel: 0x102630,
  panelLight: 0x173743,
  panelSoft: 0x20505f,
  border: 0x2d6071,
  borderSoft: 0x204755,
  cream: 0xeafaff,
  creamDark: 0xc5e4ec,
  gold: 0xf7c667,
  goldBright: 0xffe3a1,
  goldDark: 0xa97d39,
  text: 0xf2fbff,
  muted: 0x8fb4c1,
  mutedDark: 0x668a97,
  danger: 0xff7185,
  dangerDark: 0xa6394b,
  coral: 0xff6b7d,
  success: 0x7fe3ae,
  mint: 0x5ce0b8,
  mintDark: 0x1f8d6a,
  shadow: 0x02080c,
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
  cells: 15,
  selected: 25,
  hud: 80,
  toast: 90,
  overlay: 100,
  overlayPanel: 110,
} as const;
