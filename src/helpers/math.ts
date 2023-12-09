/** Fix float precision issue when: 10.53 + 0.1 === 10.629999999999999 */
export function mathFixFP(v: number): number {
  // return Math.round(v * 1e15) / 1e15; // WARN:  it doesn't work with -10.53 + 6
  return Number(v.toPrecision(15));
}

/** Scale value from one range to another; 4..20mA to 0..100deg for instance */
export function mathScaleValue(v: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const span = (toMax - toMin) / (fromMax - fromMin);
  return span * (v - fromMin) + toMin;
}

/** Apply transform.rotate on point */
export function mathRotate(cx: number, cy: number, x: number, y: number, angle: number): [number, number] {
  const rad = (Math.PI / 180) * angle;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const nx = cos * (x - cx) - sin * (y - cy) + cx;
  const ny = cos * (y - cy) + sin * (x - cx) + cy;
  return [Math.round(nx), Math.round(ny)];
}
