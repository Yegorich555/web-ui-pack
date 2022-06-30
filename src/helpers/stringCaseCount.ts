/**
 * Returns count of chars in lower case (for any language with ignoring numbers)
 * @param s
 * @param stopWith point to calc up to this value (for performance reason)
 */
export function stringLowerCount(s: string, stopWith?: number): number {
  let c = 0;
  stopWith = stopWith ?? s.length;
  const reg = /[0-9]/;
  for (let i = 0; i < s.length && c < stopWith; ++i) {
    if (s[i].toLowerCase() === s[i] && !reg.test(s[i])) {
      ++c;
    }
  }
  return c;
}

/**
 * Returns count of chars in upper case (for any language with ignoring numbers)
 * @param s
 * @param stopWith point to calc up to this value (for performance reason)
 */
export function stringUpperCount(s: string, stopWith?: number): number {
  let c = 0;
  stopWith = stopWith ?? s.length;
  const reg = /[0-9]/;
  for (let i = 0; i < s.length && c < stopWith; ++i) {
    if (s[i].toUpperCase() === s[i] && !reg.test(s[i])) {
      ++c;
    }
  }
  return c;
}

// todo cover test
// todo add to readme
