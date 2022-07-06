/** const a = NaN; a !== a; // true */
// eslint-disable-next-line no-self-compare
export const isBothNaN = (a: unknown, b: unknown): boolean => a !== a && b !== b;

/** Returns if v1 equal to v2 (compares by valueOf);
 * @tutorial Features:
 * * null NotEqual undefined
 * * compares by valueOf
 * * checks if both NaN
 * */
export default function isEqual(v1: unknown, v2: unknown): boolean {
  if (v1 == null || v2 == null) {
    return v1 === v2;
  }

  const a = (v1 as any).valueOf();
  const b = (v2 as any).valueOf();
  // eslint-disable-next-line no-self-compare
  return a === b || isBothNaN(a, b); // isBothNaN
}
