export const COLORS = {
  bgTop: 0x0b1226,
  bgBottom: 0x151b3a,
  bgDeep: 0x070b18,
  panel: 0x151f3c,
  panelLight: 0x1e2b4f,
  panelSoft: 0x293a66,
  border: 0x364a7a,
  borderSoft: 0x24345a,
  cream: 0xf7f4ea,
  creamDark: 0xd9d4c4,
  gold: 0xf5c86a,
  goldBright: 0xffe3a3,
  goldDark: 0xa8813c,
  mint: 0x6fe3c2,
  mintDark: 0x2f9a7f,
  sky: 0x7fc7f5,
  aqua: 0x4fc9e8,
  coral: 0xff7a8a,
  lavender: 0xb5a2ff,
  text: 0xf7f5ee,
  muted: 0x98a4c4,
  mutedDark: 0x6b7794,
  danger: 0xff7b86,
  dangerDark: 0xa83d4b,
  success: 0x86e0a3,
  shadow: 0x050814,
  white: 0xffffff,
  black: 0x000000,
  glass: 0xa8d8ff,
  glassDark: 0x4f6f9a,
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
  bottles: 10,
  liquid: 15,
  bottleGlow: 20,
  hud: 80,
  toast: 90,
  overlay: 100,
  overlayPanel: 110,
} as const;
