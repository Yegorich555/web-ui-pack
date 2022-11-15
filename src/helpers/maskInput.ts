interface IMaskInputOptions {
  /** Add next constant-symbol to allow user don't worry about non-digit values @default true */
  prediction?: boolean;
  /** Add missed zero: for pattern '0000-00' and string '1 ' result will be "0001-" @default true   */
  lazy?: boolean;
}

interface IMaskInputResult {
  /** Corrected result */
  text: string;
  /** Returns whether value completely fits pattern (isComplete) */
  isCompleted: boolean;
  /** Returns count chars of pattern that missed in value (used to maskHolder) */
  leftLength: number;
}

/**
 * Format string accoring to pattern
 * @param value string that must be processed
 * @param pattern 0000-00-00 (for date yyyy-MM-dd), ##0.##0.##0.##0 (for IPaddress), $ ### ### ### ### ### ##0 (for currency)
 * #### where # - optional, 0 - required numbers
 */
export default function maskInput(value: string, pattern: string, options?: IMaskInputOptions): IMaskInputResult {
  options = options || {};
  options.prediction = options.prediction ?? true;
  options.lazy = options.lazy ?? true;

  const r: IMaskInputResult = {
    text: value,
    isCompleted: false,
    leftLength: pattern.length,
  };

  if (!value) {
    const i = pattern.search(/[#0]/);
    r.text = i > 0 ? pattern.substring(0, i) : ""; // returns prefix if possible //todo need also for suffix when prefix not defined ???
    r.leftLength = pattern.length - r.text.length;
    return r;
  }

  const charIsNumber = (str: string, i: number): boolean => {
    const ascii = str.charCodeAt(i);
    return ascii > 47 && ascii < 58;
  };

  /** Returns last index of digital value; required to extract suffix */
  const lastDigIndex = (): number => {
    for (let i = pattern.length - 1; i >= 0; --i) {
      const p = pattern[i];
      if (p === "#" || p === "0") {
        return i;
      }
    }
    return -1; // case possible only if missed '#' and '0' in pattern
  };

  const s: string[] = [];
  const regSep = /[., _+-/\\]/;
  let cntOptional = 0; // count of optionalNumbers
  let cntDig = 0; // count of required digits in one chunk
  let isNewChunk = true;

  const addChunk = (char: string): void => {
    // eslint-disable-next-line no-multi-assign
    cntOptional = cntDig = 0;
    s.push(char); // for lazy mode
    isNewChunk = true;
  };

  // appendToLastChunk
  const append = (char: string): void => {
    if (isNewChunk) {
      s.push(char);
      isNewChunk = false;
    } else {
      s[s.length - 1] += char;
    }
  };

  const joinToResult = (): IMaskInputResult => {
    if (cntDig) {
      const fillDig = isNewChunk ? 0 : s[s.length - 1].length;
      r.leftLength += cntDig - fillDig; // if latest chunk contains nums >>> adjust according to optional nums
    }
    r.text = s.join("");
    return r;
  };

  const ln = Math.max(value.length, pattern.length);
  for (let vi = 0, pi = 0; vi < ln; ++vi, ++pi) {
    let p = pattern[pi];
    if (p === undefined) {
      break;
    }
    const c = value[vi];
    switch (p) {
      case "0":
        if (charIsNumber(value, vi)) {
          append(c);
        } else if (cntOptional) {
          --cntOptional;
          --vi;
        } else if (options.lazy && regSep.test(c)) {
          const last = s[s.length - 1];
          if (charIsNumber(last, 0)) {
            s[s.length - 1] = `0${last}`; // prepend '0' only if user typed number before '1234--' >>> '1234-', '1234-1-' >>> '1234-01-'
            --vi;
          } else {
            return joinToResult();
          }
        } else {
          return joinToResult();
        }
        ++cntDig;
        break;
      case "#":
        ++cntDig;
        if (charIsNumber(value, vi)) {
          append(c);
          ++cntOptional;
        } else {
          --vi;
        }
        break;
      case c:
        addChunk(c);
        break;
      case "\0": // for char '0'
        p = "0";
      // eslint-disable-next-line no-fallthrough
      case "\x01": // '\1' for char '#'
        p = "#";
        if (p === c) {
          addChunk(p);
          break;
        }
      // any not digit char
      // eslint-disable-next-line no-fallthrough
      default: {
        const isNum = charIsNumber(value, vi);
        if (isNum || regSep.test(c)) {
          addChunk(p);
          isNum && --vi; // allow 1234 convert to 123-4 for '000-0'
        } else if (options.prediction && !c && (cntDig <= s[s.length - 1].length || pi > lastDigIndex())) {
          // for '##0.#0' >>> '1' to '1' (without .)
          // for '$ ###0 USD' >>> '$ 5' to '$ 5 USD'
          addChunk(p);
        } else {
          // last chars are removed because doesn't fit pattern
          return joinToResult();
        }
      }
    }
    --r.leftLength;
  }

  r.isCompleted = true;
  return joinToResult();
}
