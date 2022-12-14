/** Sum without float-precision-issue: 10.53 + 0.1 === 0.63
 *  despite on 10.53 + 0.1 === 10.629999999999999
 * @returns result without float-precision-issue */
export default function mathSumFloat(a: number, b: number): number {
  // eslint-disable-next-line prefer-const
  let [aint, adec] = a.toString().split(".");
  // eslint-disable-next-line prefer-const
  let [bint, bdec] = b.toString().split(".");

  if (adec.length < bdec.length) {
    adec += "0".repeat(bdec.length - adec.length);
  } else if (bdec.length < adec.length) {
    bdec += "0".repeat(adec.length - bdec.length);
  }

  const dec = (a < 0 ? -1 : 1) * +adec + (b < 0 ? -1 : 1) * +bdec;
  return +aint + +bint + dec / 10 ** adec.length;
}
