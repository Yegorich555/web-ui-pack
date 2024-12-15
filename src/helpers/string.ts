/** Returns if string has not-word symbol at pointed char position */
export function isSpecialSymbol(s: string, i: number): boolean {
  const c = s.charCodeAt(i);
  return c < 65 || (c > 90 && (c < 97 || (c > 123 && c < 128)));
}

/** Returns count of chars in lower case (for any language with ignoring numbers, symbols)
 * @param s
 * @param stopWith point to calc up to this value (for performance reason) */
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

/** Returns count of chars in upper case (for any language with ignoring numbers)
 * @param s
 * @param stopWith point to calc up to this value (for performance reason) */
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
 ** Changes camelCase 'somePropValue' to 'Some Prop Value'
 ** Changes snake_case 'some_prop_value' to 'Some Prop Value'
 ** Changes kebab-case 'some-prop-value' to 'Some Prop Value';
 *
 * @param text The string to change
 * @param capitalize Set uppercase 1st letter of every word: `somePropValue` => `Some Prop Value`; @defaultValue `true`
 * @returns Prettified string */
export function stringPrettify(text: string, capitalize = true, handleKebabCase = false): string {
  let r = "";
  let nextUpper = false; // mostly it means next word
  let wasUpper = false; // tracks if the previous character was uppercase
  for (let i = 0; i < text.length; ++i) {
    const c = text.charCodeAt(i);
    if (c > 96 && c < 123) {
      // Lowercase: a-z
      wasUpper = false;
      r += String.fromCharCode(nextUpper || i === 0 ? c - 32 : c); // snake_case & kebab_case
    } else if (c > 64 && c < 91) {
      // Uppercase: A-Z
      const cNext = text.charCodeAt(i + 1);
      const isAbbr = i === text.length - 1 || (cNext > 64 && cNext < 91); // nextChar is abbreviation
      const isAbbrPrev = wasUpper && isAbbr; // prevChar + cur + next is abbreviation
      // eslint-disable-next-line prefer-template
      if (!nextUpper && !isAbbrPrev && i !== 0) {
        r += " ";
      }
      r += String.fromCharCode(capitalize || isAbbr || i === 0 ? c : c + 32); // camelCase
      wasUpper = true;
    } else if (c === 95 || (c === 45 && handleKebabCase)) {
      wasUpper = false;
      // Underscore (_) or dash (-)
      /* istanbul ignore else */
      if (i !== 0) {
        r += " ";
      }
      nextUpper = capitalize;
      continue;
    } else {
      r += String.fromCharCode(c);
      wasUpper = false;
    }
    nextUpper = false;
  }

  return r;
}
