/* eslint-disable consistent-return */
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
  /** Returns lastChunk that processed */
  lastChunk: IInputChunk;
}

interface IDigChunk {
  index: number;
  text: string;
  isDigit: true;
  min: number;
  max: number;
  isCompleted?: boolean;
}

interface ISymChunk {
  index: number;
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
      lastChunk.index = chunks.push(lastChunk) - 1;
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

/**
 * Format string accoring to pattern
 * @param value string that must be processed
 * @param pattern 0000-00-00 (for date yyyy-MM-dd), ##0.##0.##0.##0 (for IPaddress), $ ### ### ### ### ### ##0 (for currency)
 * #### where # - optional, 0 - required numbers
 */
export default function maskInput(value: string, pattern: string, options?: IMaskInputOptions): IMaskInputResult {
  options = { prediction: true, lazy: true, ...options };

  const chunks = parsePattern(pattern);

  if (!value) {
    const $1 = chunks[0];
    const text = $1.isDigit ? "" : $1.text; // returns prefix if possible //WARN: what about suffix when prefix not defined ???
    return {
      isCompleted: false,
      text,
      leftLength: pattern.length - text.length,
      chunks,
      lastChunk: $1,
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
      pi >= chunks.length &&
      (!chunks[pi - 1].isDigit || chunks[pi - 1].text.length >= (chunks[pi - 1] as IDigChunk).min),
    leftLength,
    chunks,
    lastChunk: chunks[pi - 1],
  };

  return r;
}

/** Returns chunk related to input.selectionStart */
function findChunkByCursor(this: IMaskInputResult, inputCursor: number): { chunk: IInputChunk; cursor: number } {
  const chunk = this.chunks.find((c) => {
    inputCursor -= c.text.length;
    return inputCursor < 0;
  })!;
  return { chunk, cursor: chunk.text.length + inputCursor };
}

/* Call it on 'beforeinput' event to improve logic */
export function maskBeforeInput(
  e: InputEvent,
  pattern: string,
  options?: IMaskInputOptions
): { showRemovedChunk?: boolean } | undefined {
  options = { prediction: true, lazy: true, ...options };

  const isAdd = e.inputType === "insertText";
  const isDel = !isAdd && e.inputType === "deleteContentForward";
  const isBackDel = !isAdd && !isDel && e.inputType === "deleteContentBackward";
  if (!isAdd && !isDel && !isBackDel) {
    return;
  }

  const el = e.target as HTMLInputElement;
  const v = el.value;
  const from = el.selectionStart!;

  if (isAdd) {
    const mr = maskInput(el.value, pattern, options);
    const onlyPrefix = mr.lastChunk.index === 0 && !mr.lastChunk.isDigit;
    if (onlyPrefix) {
      // move cursor to the end if it was inside prefix-chunk: '|+1('+ symbol => '+1(|'+symbol
      el.selectionStart = v.length;
      el.selectionEnd = el.selectionStart;
    } else {
      // todo findChunk.call and shift digits to right
      // todo if add digits in the middle need to shift other digits if chunk is overflow
      // console.warn({ v, from });
    }
    return;
  }

  // Process delete: when user tries to remove not digit chunk need to remove the whole chunk + 1 num
  if (!options?.prediction || from !== el.selectionEnd) {
    return; // skip action if several chars are selected
  }

  const removeIndex = (isBackDel ? 0 : 1) + from - 1; // char that will be removed
  if (removeIndex >= v.length || removeIndex < 0) {
    return; // nothing to remove
  }

  // case when 1234-- for pattern 0000-- and user tries to remove last number; prediction adds removed separator again
  // let i = removeIndex;
  const mr = maskInput(el.value, pattern, options);
  const { chunk: removeChunk, cursor } = findChunkByCursor.call(mr, removeIndex);
  let i = isBackDel ? removeIndex - removeChunk.text.length + 1 : removeIndex;
  if (removeChunk.isDigit) {
    // console.warn({ i });
    // if (removeChunk.text.length === 1 && i === 0) {
    //   el.selectionStart = i;
    //   el.selectionEnd = i;
    // }
    // todo: case1 when user removes required digits it's replaced by zeros but need to shift other digits from chunks
    return; // digits are removed by default
  }

  const nextChunk = mr.chunks[isBackDel ? removeChunk.index - 1 : removeChunk.index + 1];
  let next: string;
  if (
    isBackDel &&
    nextChunk?.isDigit &&
    nextChunk.text.length > nextChunk.min &&
    (removeChunk !== mr.lastChunk || nextChunk.text.length < nextChunk.max)
  ) {
    if (removeChunk === mr.lastChunk && nextChunk.text.length < nextChunk.max) {
      return; // rule: "12.|"" + Backspace >>> remove only separator since optional number are possible
    }
    next = v; // rule: "123.|45.789.387" + Backspace >>> 12|.45.789.387 for ##0.##0.##0.##0
  } else {
    next = v.substring(0, i) + v.substring(from); // remove chunk otherwise it's impossible
    const willVal = next.substring(0, i) + next.substring(i + 1);
    if (isDel && next === maskInput(willVal, pattern, options).text) {
      // todo: case1 when user removes required digits it's replaced by zeros but need to shift other digits from chunks
      const iNextChunk = removeIndex - (cursor - removeChunk.text.length); // startIndex char of next chunk
      i = iNextChunk; // rule: '+|1(23' + Del >>> '+1(|3'; "123|.456.789.387" + Del '123|.456.789.387'
    }
  }

  // console.warn({ next, i, iNextChunk, v, mr, nextChunk, from, removeChunk });
  if (!next) {
    return { showRemovedChunk: true }; // rule: "+1(|..." + Backspace >>> nothing to remove and need to hide&show symbol
  }

  el.value = next;
  el.selectionStart = i;
  el.selectionEnd = i;
}
