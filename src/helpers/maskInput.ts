export interface IMaskInputOptions {
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
  /** Pattern splits into chunks. With detailed info about process */
  chunks: IInputChunk[];
  /** Returns index of lastChunk that processed */
  lastChunkIndex: number;
}

interface IDigChunk {
  text: string;
  isDigit: true;
  min: number;
  max: number;
  isCompleted?: boolean;
}

interface ISymChunk {
  text: string;
  isDigit?: false;
}

type IInputChunk = IDigChunk | ISymChunk;

function parsePattern(pattern: string): IInputChunk[] {
  const chunks: IInputChunk[] = [];
  let lastChunk: IInputChunk | null = null;
  const setToChunk = (char: string, isDigit: boolean | undefined): IInputChunk => {
    if (!lastChunk || lastChunk.isDigit !== isDigit) {
      lastChunk = { text: char } as IDigChunk;
      if (isDigit) {
        lastChunk.isDigit = true;
        lastChunk.max = 0;
        lastChunk.min = 0;
      }
      chunks.push(lastChunk);
    } else {
      lastChunk.text += char;
    }
    return lastChunk;
  };

  // 1st step: define pattern chunks
  for (let i = 0; i < pattern.length; ++i) {
    const p = pattern[i];
    switch (p) {
      case "0":
        ++(setToChunk(p, true) as IDigChunk).max;
        ++(lastChunk! as IDigChunk).min;
        break;
      case "#":
        ++(setToChunk(p, true) as IDigChunk).max;
        break;
      default:
        setToChunk(p, undefined);
        break;
    }
  }

  return chunks;
}

// let memo: Record<string, IMaskInputChunk[]> = {};

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

  // let pchunks = memo[pattern];
  // if (pchunks === undefined) {
  //   pchunks = parsePattern(pattern);
  //   memo = { pattern: pchunks }; // store only last pattern
  // }
  const chunks = parsePattern(pattern);

  if (!value) {
    const $1 = chunks[0];
    const text = $1.isDigit ? "" : $1.text; // returns prefix if possible //WARN: what about suffix when prefix not defined ???
    return {
      isCompleted: false,
      text,
      leftLength: pattern.length - text.length,
      chunks,
      lastChunkIndex: 0,
    };
  }

  let pi = 0;
  for (let i = 0; pi < chunks.length && i < value.length; ++pi) {
    const chunk = chunks[pi];
    if (chunk.isDigit) {
      chunk.text = "";
      for (let ci = 0; ci < chunk.max && i < value.length; ++ci, ++i) {
        const ascii = value.charCodeAt(i);
        const isNum = ascii > 47 && ascii < 58;
        if (isNum) {
          chunk.text += String.fromCharCode(ascii);
          chunk.isCompleted = chunk.text.length >= chunk.min;
        } else if (chunk.isCompleted && chunks[pi + 1]?.text.charCodeAt(0) === ascii) {
          break; // skip chunk if length fits min
        } else if (options.lazy && /[., _+-/\\]/.test(String.fromCharCode(ascii)) && ci) {
          const cnt = chunk.min - ci;
          if (cnt > 0) {
            chunk.text = "0".repeat(chunk.min - ci) + chunk.text; // add zero before in lazy mode
          }
          chunk.isCompleted = true;
          // ++i;
          break;
        } else {
          --ci; // : otherwise skip this char
        }
      }
    } else {
      for (let ci = 0; ci < chunk.text.length && i < value.length; ++ci) {
        if (chunk.text[ci] === value[i] || /[., _+-/\\]/.test(value[i])) {
          ++i;
        }
      }
      // i += chunk.text.length; // analyze of chars doesn't required since it's not changable
    }
  }

  if (options.prediction && pi !== chunks.length) {
    const last = chunks[pi - 1];
    if (last.isDigit && last.max === last.text.length) {
      ++pi; // append suffix if prev digitChunk is filled completely
    }
  }

  // append suffix at the end if all chunks are completed & only lacks suffix
  if (pi === chunks.length - 1 && (chunks[pi - 1] as IDigChunk).isCompleted) {
    ++pi;
  }

  // find leftLength for maskholder
  const last = chunks[pi - 1];
  let leftLength = last.isDigit ? last.max - last.text.length : 0; // if last proccess chunk is digit than need to call diff actual and max
  for (let i = pi; i < chunks.length; ++i) {
    leftLength += chunks[i].text.length;
  }

  const r: IMaskInputResult = {
    text: chunks.reduce((str, c, i) => (i < pi ? str + c.text : str), ""),
    isCompleted:
      (pi >= chunks.length && !chunks[pi - 1].isDigit) ||
      chunks[pi - 1].text.length >= (chunks[pi - 1] as IDigChunk).min,
    leftLength,
    chunks,
    lastChunkIndex: pi - 1,
  };

  return r;
}

// console.warn(maskInput("123.4.5.", "##0.##0.##0.##0"));
// console.warn(maskInput("123.4.5", "##0.##0.##0.##0"));
