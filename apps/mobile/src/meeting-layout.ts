/** Grid column count for participant tiles (1–4 columns). */
export function gridColumnsForCount(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}
