/** Sum without float-precision-issue: 10.53 + 0.1 === 0.63
 *  despite on 10.53 + 0.1 === 10.629999999999999
 * @returns result without float-precision-issue */
export function mathSumFloat(a: number, b: number): number {
  // eslint-disable-next-line prefer-const
  let [aint, adec] = a.toString().split(".");
  // eslint-disable-next-line prefer-const
  let [bint, bdec] = b.toString().split(".");

  if (adec === undefined) adec = "";
  if (bdec === undefined) bdec = "";

  if (adec.length < bdec.length) {
    adec += "0".repeat(bdec.length - adec.length);
  } else if (bdec.length < adec.length) {
    bdec += "0".repeat(adec.length - bdec.length);
  }

  const dec = (a < 0 ? -1 : 1) * +adec + (b < 0 ? -1 : 1) * +bdec;
  return +aint + +bint + dec / 10 ** adec.length;
}

/** Scale value from one range to another; 4..20mA to 0..100deg for instance */
export function mathScaleValue(v: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const span = (toMax - toMin) / (fromMax - fromMin);
  return span * (v - fromMin) + toMin;
}

/** Apply transform.rotate on point */
// export function rotate(cx: number, cy: number, x: number, y: number, angle: number): [number, number] {
//   const rad = (Math.PI / 180) * angle;
//   const cos = Math.cos(rad);
//   const sin = Math.sin(rad);
//   const nx = cos * (x - cx) - sin * (y - cy) + cx;
//   const ny = cos * (y - cy) + sin * (x - cx) + cy;
//   return [nx, ny];
// }
