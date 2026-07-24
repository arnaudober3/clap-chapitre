/** French thousands grouping with a plain space ("8940" → "8 940"). */
export function frNumber(value: number): string {
  // fr-FR grouping uses narrow/no-break spaces (U+202F / U+00A0); normalize to a
  // plain space so markup and tests stay predictable.
  return value.toLocaleString('fr-FR').replace(/[  ]/g, ' ');
}
