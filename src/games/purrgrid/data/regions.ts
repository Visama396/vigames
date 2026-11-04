import { REGION_COLORS, REGION_MARKS } from "../config.ts";
import type { RegionId } from "../types/puzzle.ts";

/** Color pastel estable para una región. */
export function regionColor(regionId: RegionId): number {
  const palette = REGION_COLORS;
  return palette[regionId % palette.length] ?? palette[0];
}

/** Marca sutil para distinguir regiones sin depender solo del color. */
export function regionMark(regionId: RegionId): string {
  return REGION_MARKS[regionId % REGION_MARKS.length] ?? "·";
}

/** Oscurece un color RGB mezclándolo con el fondo. */
export function darken(color: number, amount = 0.35): number {
  const factor = Math.max(0, Math.min(1, 1 - amount));
  const red = Math.round(((color >> 16) & 0xff) * factor);
  const green = Math.round(((color >> 8) & 0xff) * factor);
  const blue = Math.round((color & 0xff) * factor);
  return (red << 16) | (green << 8) | blue;
}

/** Aclara un color RGB mezclándolo con blanco. */
export function lighten(color: number, amount = 0.25): number {
  const factor = Math.max(0, Math.min(1, amount));
  const mix = (channel: number) => Math.round(channel + (255 - channel) * factor);
  const red = mix((color >> 16) & 0xff);
  const green = mix((color >> 8) & 0xff);
  const blue = mix(color & 0xff);
  return (red << 16) | (green << 8) | blue;
}
