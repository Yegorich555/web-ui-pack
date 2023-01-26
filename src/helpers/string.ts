/** Returns if string has not-word symbol at pointed char position */
export function isSpecialSymbol(s: string, i: number): boolean {
  const c = s.charCodeAt(i);
  return c < 65 || (c > 90 && (c < 97 || (c > 123 && c < 128)));
}

/**
 * Returns count of chars in lower case (for any language with ignoring numbers, symbols)
 * @param s
 * @param stopWith point to calc up to this value (for performance reason)
 */
export function stringLowerCount(s: string, stopWith?: number): number {
  let c = 0;
  stopWith = stopWith ?? s.length;
  for (let i = 0; i < s.length && c < stopWith; ++i) {
    if (s[i].toLowerCase() === s[i] && !isSpecialSymbol(s, i)) {
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
  for (let i = 0; i < s.length && c < stopWith; ++i) {
    if (s[i].toUpperCase() === s[i] && !isSpecialSymbol(s, i)) {
      ++c;
    }
  }
  return c;
}

/**
 * Changes camelCase 'somePropValue' to 'Some Prop Value'
 *
 * Changes snakeCase 'some_prop_value' to 'Some prop value'
 *
 * Changes kebabCase 'some-prop-value' to 'Some prop value'; `false` by default
 *
 * To capitalize use css [text-transform: capitalize]
 * @param text The string to change
 * @param changeKebabCase Set true to apply kebabCase rule; `false` by default
 * @returns Prettified string
 */
export function stringPrettify(text: string, changeKebabCase = false): string {
  const r = text
    .replace(/([A-ZА-Я])/g, " $1")
    .trimStart()
    .replace(new RegExp(`[_${(changeKebabCase && "-") || ""}]`, "g"), " ")
    .replace(/[ ]{2,}/, " ");
  return r.charAt(0).toUpperCase() + r.slice(1);
}
