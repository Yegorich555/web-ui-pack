function getDateVal(v: Date, utc: boolean): number {
  if (utc) {
    return v.getUTCFullYear() * 1000 + v.getUTCMonth() * 32 + v.getUTCDate();
  }
  return v.getFullYear() * 1000 + v.getMonth() * 32 + v.getDate();
}

/** Compare by Date-values without Time
 * @return 1, -1 or 0 */
export default function dateCompareWithoutTime(v1: Date, v2: Date, utc: boolean): number {
  const d1 = getDateVal(v1, utc);
  const d2 = getDateVal(v2, utc);

  if (d1 > d2) return 1;
  if (d1 < d2) return -1;
  return 0;
}
